"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { logAudit } from "@/lib/audit";
import { ensureSalesLedgerAccounts, postCustomerInvoiceJournal, postCustomerPaymentJournal } from "@/lib/finance/sales-posting";
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

/** Record a (full or partial) payment against an invoice, keeping AR in sync. */
export async function recordInvoicePayment(invoiceId: string, amount: number): Promise<{ success: true }> {
  const { currentBusinessId: businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission("sales.write");

  const inv = await db.customerInvoice.findFirst({ where: { id: invoiceId, businessId, deletedAt: null } });
  if (!inv) throw new Error("Invoice not found");

  const pay = Math.min(Math.max(0, Math.round(amount)), inv.remainingAmount.toNumber());
  if (pay <= 0) throw new Error("Nothing to pay — the invoice is already settled");
  const newPaid = inv.paidAmount.toNumber() + pay;
  const newRemaining = inv.totalAmount.toNumber() - newPaid;
  const status = newRemaining <= 0 ? "PAID" : "PARTIALLY_PAID";

  // Post the cash receipt to the ledger FIRST (DR Cash & Bank / CR Accounts Receivable). If the
  // posting fails, the payment is not applied — keeping the ledger and receivables in lock-step.
  await ensureSalesLedgerAccounts(businessId);
  await postCustomerPaymentJournal({ businessId, tenantId, invoiceId: inv.id, code: inv.code, amount: pay, approvedBy: userId });

  await db.customerInvoice.update({ where: { id: inv.id }, data: { paidAmount: newPaid, remainingAmount: newRemaining, status } });
  await db.receivableEntry.updateMany({
    where: { sourceType: "CUSTOMER_INVOICE", sourceId: inv.id },
    data: { paidAmount: newPaid, status: newRemaining <= 0 ? "CLOSED" : "PARTIALLY_PAID" },
  });
  await logAudit({ action: "payment", resource: "invoice", resourceId: inv.id, metadata: { code: inv.code, amount: pay } });

  revalidatePath("/sales/invoices");
  revalidatePath(`/sales/invoices/${inv.id}`);
  revalidatePath("/finance/receivables");
  return { success: true };
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
