"use server";

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { logAudit } from "@/lib/audit";
import { ensureSalesLedgerAccounts, postCustomerInvoiceJournal, postCustomerPaymentJournal } from "@/lib/finance/sales-posting";
import { FinancialPostingService } from "@/lib/finance/posting-engine";
import { revalidatePath } from "next/cache";

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

/** Sequential invoice number for the business, e.g. INV-<slug>-0001. */
async function nextInvoiceNumber(businessId: string, slug: string): Promise<string> {
  const count = await db.customerInvoice.count({ where: { businessId } });
  return `INV-${slug}-${String(count + 1).padStart(4, "0")}`;
}

export async function createCustomerInvoice(input: {
  customerId: string;
  lines: InvoiceLineInput[];
  paidAmount?: number;
}): Promise<{ id: string }> {
  const { currentBusinessId: businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission("sales.write");

  const lines = input.lines.filter((l) => l.description.trim() && l.quantity > 0);
  if (!input.customerId) throw new Error("Select a customer");
  if (lines.length === 0) throw new Error("Add at least one line item");

  const business = await db.business.findUnique({ where: { id: businessId }, select: { slug: true, defaultCurrencyId: true } });
  const customer = await db.customer.findFirst({ where: { id: input.customerId, businessId, deletedAt: null } });
  if (!customer) throw new Error("Customer not found in this business");

  const currency = business?.defaultCurrencyId
    ? { id: business.defaultCurrencyId }
    : (await db.currency.findFirst());
  if (!currency) throw new Error("No currency configured");

  const total = Math.round(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
  const paid = Math.min(Math.max(0, Math.round(input.paidAmount ?? 0)), total);
  const remaining = total - paid;
  const code = await nextInvoiceNumber(businessId, business?.slug ?? "biz");
  const status = remaining <= 0 ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "ISSUED";

  const invoice = await db.customerInvoice.create({
    data: {
      businessId,
      code,
      customerId: customer.id,
      currencyId: currency.id,
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: remaining,
      status,
      sourceType: "MANUAL",
      sourceId: `manual-${code}`,
      lines: {
        create: lines.map((l) => ({
          description: l.description.trim(),
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          totalPrice: Math.round(l.quantity * l.unitPrice),
        })),
      },
    },
  });

  // Mirror into the receivables ledger so AR reconciles.
  await db.receivableEntry.create({
    data: {
      businessId,
      customerId: customer.id,
      sourceType: "CUSTOMER_INVOICE",
      sourceId: invoice.id,
      amount: total,
      paidAmount: paid,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 15)),
      status: remaining <= 0 ? "CLOSED" : paid > 0 ? "PARTIALLY_PAID" : "OPEN",
    },
  });

  // Post the accounting entries (DR AR / CR Revenue / CR Output GST). An invoice that cannot be
  // posted to the ledger must not exist — compensate by removing it on failure so we never leave
  // an unposted invoice (which would make the ledger disagree with receivables).
  await ensureSalesLedgerAccounts(businessId);
  try {
    await postCustomerInvoiceJournal({ businessId, tenantId, invoiceId: invoice.id, code, total, approvedBy: userId });
    if (paid > 0) {
      await postCustomerPaymentJournal({ businessId, tenantId, invoiceId: invoice.id, code, amount: paid, approvedBy: userId });
    }
  } catch (err) {
    await db.receivableEntry.deleteMany({ where: { sourceType: "CUSTOMER_INVOICE", sourceId: invoice.id } });
    await db.customerInvoice.delete({ where: { id: invoice.id } });
    throw new Error(`Invoice not created — ledger posting failed: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  await logAudit({ action: "create", resource: "invoice", resourceId: invoice.id, metadata: { code, total, customer: customer.name } });
  revalidatePath("/sales/invoices");
  revalidatePath("/finance/receivables");
  revalidatePath("/finance");
  return { id: invoice.id };
}

/**
 * Record a (full or partial) payment against an invoice — the canonical customer-payment path.
 *
 * One atomic transaction creates a CustomerPayment record (its own id), the matching CashTransaction,
 * reduces the invoice + AR subledger, and posts the GL (DR Cash / CR AR) keyed by the unique
 * payment.id. Many partial payments against one invoice are allowed (each posts its own journal).
 *
 * Idempotency: pass a stable `idempotencyKey` (one per user payment intent) to make a retried submit
 * a no-op. The invoice UI does NOT yet supply one, so a double-submit without a key currently creates
 * two payments — genuine double-submit protection needs a UI-supplied token (and, durably, a unique
 * column). Replay of the GL by (CUSTOMER_PAYMENT, payment.id) IS unique per event.
 */
export async function recordInvoicePayment(invoiceId: string, amount: number, idempotencyKey?: string): Promise<{ success: true; paymentId?: string }> {
  const { currentBusinessId: businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission("sales.write");

  // Ensure ledger accounts exist (idempotent upserts) before opening the payment transaction.
  await ensureSalesLedgerAccounts(businessId);

  const result = await db.$transaction(async (tx) => {
    // Opt-in double-submit guard: if a stable key is supplied and a payment already carries it, do
    // nothing further. (No-op until the UI sends a key; see the doc comment above.)
    if (idempotencyKey) {
      const existing = await tx.customerPayment.findFirst({ where: { businessId, invoiceId, reference: idempotencyKey } });
      if (existing) return { paymentId: existing.id, deduped: true as const, code: "", pay: 0 };
    }

    const inv = await tx.customerInvoice.findFirst({ where: { id: invoiceId, businessId, deletedAt: null } });
    if (!inv) throw new Error("Invoice not found");
    if (inv.status === "CANCELLED") throw new Error("Cannot pay a cancelled invoice");

    const pay = Math.min(Math.max(0, Math.round(amount)), inv.remainingAmount.toNumber());
    if (pay <= 0) throw new Error("Nothing to pay — the invoice is already settled");
    const newPaid = inv.paidAmount.toNumber() + pay;
    const newRemaining = inv.totalAmount.toNumber() - newPaid;
    const status = newRemaining <= 0 ? "PAID" : "PARTIALLY_PAID";

    // 1. Canonical payment record (unique payment.id per payment event).
    const payment = await tx.customerPayment.create({
      data: { businessId, invoiceId: inv.id, amount: new Prisma.Decimal(pay), currencyId: inv.currencyId, reference: idempotencyKey ?? undefined, createdBy: userId },
    });

    // 2. Cash ledger (CASH_IN), referencing the payment.
    await tx.cashTransaction.create({
      data: { businessId, type: "CASH_IN", amount: new Prisma.Decimal(pay), currencyId: inv.currencyId, reference: payment.id, description: `Payment for Invoice ${inv.code}`, sourceType: "MANUAL", sourceId: payment.id, createdBy: userId },
    });

    // 3. Invoice + AR subledger.
    await tx.customerInvoice.update({ where: { id: inv.id }, data: { paidAmount: newPaid, remainingAmount: newRemaining, status } });
    await tx.receivableEntry.updateMany({
      where: { businessId, sourceType: "CUSTOMER_INVOICE", sourceId: inv.id },
      data: { paidAmount: newPaid, status: newRemaining <= 0 ? "CLOSED" : "PARTIALLY_PAID" },
    });

    // 4. GL (DR Cash / CR AR) posted INSIDE this transaction, keyed by the unique payment.id.
    await FinancialPostingService.postEntry({
      businessId, tenantId, tx,
      description: `Payment received for invoice ${inv.code}`,
      reference: inv.code,
      sourceType: "CUSTOMER_PAYMENT",
      sourceId: payment.id,
      approvedBy: userId,
      lines: [
        { accountCode: "1000", debit: pay }, // Cash & Bank
        { accountCode: "1100", credit: pay }, // Accounts Receivable
      ],
    });

    return { paymentId: payment.id, deduped: false as const, code: inv.code, pay };
  });

  if (!result.deduped) {
    await logAudit({ action: "payment", resource: "invoice", resourceId: invoiceId, metadata: { code: result.code, amount: result.pay } });
  }
  revalidatePath("/sales/invoices");
  revalidatePath(`/sales/invoices/${invoiceId}`);
  revalidatePath("/finance/receivables");
  return { success: true, paymentId: result.paymentId };
}

/** Void an invoice — keeps the record for audit, removes it from open AR. */
export async function voidInvoice(invoiceId: string): Promise<{ success: true }> {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.write");

  const inv = await db.customerInvoice.findFirst({ where: { id: invoiceId, businessId, deletedAt: null } });
  if (!inv) throw new Error("Invoice not found");
  if (inv.status === "PAID") throw new Error("A paid invoice cannot be voided");

  await db.customerInvoice.update({ where: { id: inv.id }, data: { status: "CANCELLED", remainingAmount: 0 } });
  await db.receivableEntry.updateMany({
    where: { sourceType: "CUSTOMER_INVOICE", sourceId: inv.id },
    data: { status: "WRITTEN_OFF" },
  });
  await logAudit({ action: "void", resource: "invoice", resourceId: inv.id, metadata: { code: inv.code } });

  revalidatePath("/sales/invoices");
  revalidatePath(`/sales/invoices/${inv.id}`);
  revalidatePath("/finance/receivables");
  return { success: true };
}

/** Soft-delete an invoice and remove it from receivables. */
export async function deleteInvoice(invoiceId: string): Promise<{ success: true }> {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.write");

  const inv = await db.customerInvoice.findFirst({ where: { id: invoiceId, businessId, deletedAt: null } });
  if (!inv) throw new Error("Invoice not found");
  if (inv.paidAmount.toNumber() > 0) throw new Error("An invoice with payments cannot be deleted — void it instead");

  await db.receivableEntry.deleteMany({ where: { sourceType: "CUSTOMER_INVOICE", sourceId: inv.id } });
  await db.customerInvoice.update({ where: { id: inv.id }, data: { deletedAt: new Date() } });
  await logAudit({ action: "delete", resource: "invoice", resourceId: inv.id, metadata: { code: inv.code } });

  revalidatePath("/sales/invoices");
  revalidatePath("/finance/receivables");
  return { success: true };
}
