"use server";

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { logAudit } from "@/lib/audit";
import { ensureSalesLedgerAccounts, postCustomerInvoiceJournal, applyCustomerPaymentTx } from "@/lib/finance/sales-posting";
import { revalidatePath } from "next/cache";

/**
 * A retried payment must target the SAME invoice and amount as the one the key already recorded.
 * A key reused for a materially different payment (other invoice/amount) is rejected — never silently
 * replayed — so a reused key cannot turn a different request into a no-op.
 */
function assertSamePaymentOp(existing: { invoiceId: string | null; amount: Prisma.Decimal }, invoiceId: string, amount: number) {
  if (existing.invoiceId !== invoiceId || existing.amount.toNumber() !== Math.round(amount)) {
    throw new Error("This payment key was already used for a different payment");
  }
}

/** True ONLY for a unique-violation on the customer-payment idempotency index — not any other P2002. */
function isIdempotencyKeyConflict(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  const t = (e.meta as { target?: unknown } | undefined)?.target;
  const s = Array.isArray(t) ? t.join(",") : typeof t === "string" ? t : "";
  return s.toLowerCase().includes("idempotency");
}

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
  const code = await nextInvoiceNumber(businessId, business?.slug ?? "biz");

  // Ledger accounts must exist before posting (idempotent upserts, outside the transaction).
  await ensureSalesLedgerAccounts(businessId);

  // Everything below is ONE atomic transaction: invoice + lines + AR subledger + invoice journal +
  // (optional) initial payment. Any failure rolls the whole thing back, so we never leave an invoice
  // whose ledger/receivables disagree — replacing the old create-then-compensating-delete pattern.
  const invoiceId = await db.$transaction(async (tx) => {
    // Create the invoice UNPAID; an initial payment (if any) is applied via the canonical payment
    // path below so it produces a real CustomerPayment + CashTransaction + payment-id-keyed journal.
    const invoice = await tx.customerInvoice.create({
      data: {
        businessId,
        code,
        customerId: customer.id,
        currencyId: currency.id,
        totalAmount: total,
        paidAmount: 0,
        remainingAmount: total,
        status: "ISSUED",
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

    // Mirror into the receivables ledger (OPEN); the initial payment updates it below.
    await tx.receivableEntry.create({
      data: {
        businessId,
        customerId: customer.id,
        sourceType: "CUSTOMER_INVOICE",
        sourceId: invoice.id,
        amount: total,
        paidAmount: 0,
        dueDate: new Date(new Date().setDate(new Date().getDate() + 15)),
        status: "OPEN",
      },
    });

    // Invoice GL (DR AR / CR Revenue / CR Output GST), inside the transaction.
    await postCustomerInvoiceJournal({ businessId, tenantId, invoiceId: invoice.id, code, total, approvedBy: userId, tx });

    // Initial payment (if any) — canonical path: CustomerPayment + CashTransaction + GL by payment.id.
    if (paid > 0) {
      await applyCustomerPaymentTx(tx, {
        businessId, tenantId, userId,
        invoiceId: invoice.id, invoiceCode: code, currencyId: currency.id,
        amount: paid, newPaid: paid, newRemaining: total - paid,
      });
    }

    return invoice.id;
  });

  await logAudit({ action: "create", resource: "invoice", resourceId: invoiceId, metadata: { code, total, customer: customer.name } });
  revalidatePath("/sales/invoices");
  revalidatePath("/finance/receivables");
  revalidatePath("/finance");
  return { id: invoiceId };
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

  const revalidate = () => {
    revalidatePath("/sales/invoices");
    revalidatePath(`/sales/invoices/${invoiceId}`);
    revalidatePath("/finance/receivables");
  };

  try {
    const result = await db.$transaction(async (tx) => {
      // Idempotency pre-check FIRST — before clamping — so a replay against a now-settled invoice
      // returns the original payment instead of failing "nothing to pay". Scoped to this tenant.
      if (idempotencyKey) {
        const existing = await tx.customerPayment.findFirst({ where: { businessId, idempotencyKey } });
        if (existing) {
          assertSamePaymentOp(existing, invoiceId, amount);
          return { paymentId: existing.id, deduped: true as const, code: "", pay: 0 };
        }
      }

      const inv = await tx.customerInvoice.findFirst({ where: { id: invoiceId, businessId, deletedAt: null } });
      if (!inv) throw new Error("Invoice not found");
      if (inv.status === "CANCELLED") throw new Error("Cannot pay a cancelled invoice");

      const pay = Math.min(Math.max(0, Math.round(amount)), inv.remainingAmount.toNumber());
      if (pay <= 0) throw new Error("Nothing to pay — the invoice is already settled");
      const newPaid = inv.paidAmount.toNumber() + pay;
      const newRemaining = inv.totalAmount.toNumber() - newPaid;

      // Canonical payment application (payment record + cash + AR + GL keyed by payment.id). The
      // insert carries idempotencyKey; the partial unique index makes a concurrent duplicate fail.
      const payment = await applyCustomerPaymentTx(tx, {
        businessId, tenantId, userId,
        invoiceId: inv.id, invoiceCode: inv.code, currencyId: inv.currencyId,
        amount: pay, newPaid, newRemaining, idempotencyKey,
      });

      return { paymentId: payment.id, deduped: false as const, code: inv.code, pay };
    });

    if (!result.deduped) {
      await logAudit({ action: "payment", resource: "invoice", resourceId: invoiceId, metadata: { code: result.code, amount: result.pay } });
    }
    revalidate();
    return { success: true, paymentId: result.paymentId };
  } catch (e) {
    // Concurrent duplicate: the unique index rejected the second insert of the same key and the
    // transaction aborted. ONLY the idempotency-key conflict is treated as a replay — re-query OUTSIDE
    // the aborted transaction, within THIS tenant + key, confirm it is the same operation, and return
    // the winner instead of creating a second payment. Any other P2002 propagates unchanged.
    if (idempotencyKey && isIdempotencyKeyConflict(e)) {
      const existing = await db.customerPayment.findFirst({ where: { businessId, idempotencyKey } });
      if (existing) {
        assertSamePaymentOp(existing, invoiceId, amount);
        revalidate();
        return { success: true, paymentId: existing.id };
      }
    }
    throw e;
  }
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
