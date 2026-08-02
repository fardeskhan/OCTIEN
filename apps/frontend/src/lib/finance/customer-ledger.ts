/**
 * Canonical Customer Ledger — the single source of truth for a customer's receivables position.
 *
 * Assembled from existing accounting data (customer invoices = debits, customer payments =
 * credits) with outstanding/overdue reconciled against the `ReceivableEntry` AR subledger.
 * Statements, aging, collections and credit checks should all consume THIS service rather than
 * re-querying invoices and payments independently.
 *
 * Known schema gaps (surfaced honestly, not faked):
 *   - Customers have no `creditLimit` (only suppliers do) → creditLimit / availableCredit are null.
 *   - There is no `CreditNote` model yet → credit-note rows are omitted until it exists.
 */
import { db } from "@/lib/db";
import { buildLedger, type LedgerEntry, type LedgerLine } from "./ledger-engine";

export type LedgerTxnType = "Opening Balance" | "Invoice" | "Payment" | "Credit Note";

/** A customer ledger row (shared shape from the ledger engine, typed to customer txn types). */
export type LedgerTxn = LedgerLine<LedgerTxnType>;

export interface CustomerLedger {
  customerId: string;
  name: string;
  code: string;
  transactions: LedgerTxn[];
  outstandingBalance: number;
  overdueAmount: number;
  totalInvoiced: number;
  totalPaid: number;
  lastInvoice: { reference: string; date: Date; amount: number } | null;
  lastPayment: { date: Date; amount: number } | null;
  creditLimit: number | null;
  availableCredit: number | null;
  averageCollectionDays: number | null;
}

export async function getCustomerLedger(businessId: string, customerId: string): Promise<CustomerLedger | null> {
  const customer = await db.customer.findFirst({ where: { id: customerId, businessId, deletedAt: null } });
  if (!customer) return null;

  const [invoices, payments, receivables] = await Promise.all([
    db.customerInvoice.findMany({ where: { businessId, customerId, deletedAt: null }, orderBy: { createdAt: "asc" } }),
    db.customerPayment.findMany({ where: { businessId, customerId }, orderBy: { paymentDate: "asc" } }),
    db.receivableEntry.findMany({ where: { businessId, customerId, sourceType: "CUSTOMER_INVOICE" } }),
  ]);

  const entries: LedgerEntry<LedgerTxnType>[] = [];
  for (const inv of invoices) {
    entries.push({ date: inv.createdAt, reference: inv.code, type: "Invoice", debit: inv.totalAmount.toNumber(), credit: 0 });
  }
  for (const p of payments) {
    entries.push({ date: p.paymentDate, reference: p.reference ?? "Payment", type: "Payment", debit: 0, credit: p.amount.toNumber() });
  }

  // Single source of truth: the AR subledger (ReceivableEntry.paidAmount) is authoritative for how
  // much has been settled. Any paid amount NOT already represented by an explicit payment row is
  // added as one reconciling "Payments applied" credit, so the ledger's outstanding equals the
  // subledger's — and therefore equals the Aging report. (When real payments create both a payment
  // row and update the subledger, the gap is zero and no synthetic line is added.)
  const subledgerPaid = receivables.reduce((s, r) => s + r.paidAmount.toNumber(), 0);
  const paymentRowTotal = payments.reduce((s, p) => s + p.amount.toNumber(), 0);
  const unreconciledPaid = subledgerPaid - paymentRowTotal;
  if (unreconciledPaid > 0.01) {
    const asOf = invoices.length ? invoices[invoices.length - 1].createdAt : new Date();
    entries.push({ date: asOf, reference: "Payments applied", type: "Payment", debit: 0, credit: unreconciledPaid });
  }

  const built = buildLedger(entries);
  const transactions: LedgerTxn[] = built.lines;

  const totalInvoiced = built.totalDebit;
  const totalPaid = built.totalCredit; // = subledger paid (rows + reconciling settlement)
  const outstandingBalance = built.balance; // = totalInvoiced − subledger paid → matches Aging

  const now = Date.now();
  const overdueAmount = receivables
    .filter((r) => r.status !== "CLOSED" && r.status !== "WRITTEN_OFF" && r.dueDate && r.dueDate.getTime() < now)
    .reduce((s, r) => s + (r.amount.toNumber() - r.paidAmount.toNumber()), 0);

  const lastInv = invoices[invoices.length - 1];
  const lastPay = payments[payments.length - 1];

  // Average collection days: for payments allocated to a specific invoice, the gap between the
  // invoice date and the payment date.
  const invById = new Map(invoices.map((i) => [i.id, i]));
  const linked = payments.filter((p) => p.invoiceId && invById.has(p.invoiceId));
  const averageCollectionDays = linked.length > 0
    ? Math.round(
        linked.reduce((s, p) => s + (p.paymentDate.getTime() - invById.get(p.invoiceId as string)!.createdAt.getTime()) / 86_400_000, 0) /
          linked.length,
      )
    : null;

  return {
    customerId: customer.id,
    name: customer.name,
    code: customer.code,
    transactions,
    outstandingBalance,
    overdueAmount: Math.max(0, overdueAmount),
    totalInvoiced,
    totalPaid,
    lastInvoice: lastInv ? { reference: lastInv.code, date: lastInv.createdAt, amount: lastInv.totalAmount.toNumber() } : null,
    lastPayment: lastPay ? { date: lastPay.paymentDate, amount: lastPay.amount.toNumber() } : null,
    creditLimit: null, // not modeled for customers
    availableCredit: null,
    averageCollectionDays,
  };
}
