/**
 * Canonical Vendor (supplier) Ledger — the AP mirror of the Customer Ledger, built on the shared
 * `ledger-engine`. Source of truth for what we owe suppliers: bills = debit, payments = credit
 * (so running balance = outstanding AP). Overdue reconciles against the `PayableEntry` subledger.
 *
 * Unlike customers, suppliers DO carry a `creditLimit`, so available credit is real here.
 */
import { db } from "@/lib/db";
import { buildLedger, type LedgerEntry, type LedgerLine } from "./ledger-engine";

export type VendorLedgerTxnType = "Opening Balance" | "Bill" | "Payment" | "Debit Note";

export type VendorLedgerTxn = LedgerLine<VendorLedgerTxnType>;

export interface VendorLedger {
  supplierId: string;
  name: string;
  code: string;
  transactions: VendorLedgerTxn[];
  outstandingBalance: number;
  overdueAmount: number;
  totalPurchased: number;
  totalPaid: number;
  lastBill: { reference: string; date: Date; amount: number } | null;
  lastPayment: { date: Date; amount: number } | null;
  creditLimit: number | null;
  availableCredit: number | null;
  averagePaymentDays: number | null;
}

export async function getVendorLedger(businessId: string, supplierId: string): Promise<VendorLedger | null> {
  const supplier = await db.supplier.findFirst({ where: { id: supplierId, businessId, deletedAt: null } });
  if (!supplier) return null;

  const [bills, payments] = await Promise.all([
    db.supplierBill.findMany({ where: { businessId, supplierId, deletedAt: null }, orderBy: { createdAt: "asc" } }),
    db.supplierPayment.findMany({ where: { businessId, bill: { supplierId } }, orderBy: { paymentDate: "asc" } }),
  ]);

  const billIds = bills.map((b) => b.id);
  const payables = billIds.length
    ? await db.payableEntry.findMany({ where: { businessId, sourceType: "SUPPLIER_BILL", sourceId: { in: billIds } } })
    : [];

  const entries: LedgerEntry<VendorLedgerTxnType>[] = [];
  for (const b of bills) {
    entries.push({ date: b.createdAt, reference: b.code, type: "Bill", debit: b.totalAmount.toNumber(), credit: 0 });
  }
  for (const p of payments) {
    entries.push({ date: p.paymentDate, reference: p.reference ?? "Payment", type: "Payment", debit: 0, credit: p.amount.toNumber() });
  }

  // Single source of truth: the AP subledger (PayableEntry.paidAmount) is authoritative for settled
  // amounts. Add any paid amount not already represented by a payment row as one reconciling
  // "Payments applied" credit, so the ledger's outstanding matches the AP Aging report.
  const subledgerPaid = payables.reduce((s, r) => s + r.paidAmount.toNumber(), 0);
  const paymentRowTotal = payments.reduce((s, p) => s + p.amount.toNumber(), 0);
  const unreconciledPaid = subledgerPaid - paymentRowTotal;
  if (unreconciledPaid > 0.01) {
    const asOf = bills.length ? bills[bills.length - 1].createdAt : new Date();
    entries.push({ date: asOf, reference: "Payments applied", type: "Payment", debit: 0, credit: unreconciledPaid });
  }

  const built = buildLedger(entries);

  const totalPurchased = built.totalDebit;
  const totalPaid = built.totalCredit; // = subledger paid (rows + reconciling settlement)
  const outstandingBalance = built.balance; // = totalPurchased − subledger paid → matches AP Aging

  const now = Date.now();
  const overdueAmount = payables
    .filter((r) => r.status !== "PAID" && r.dueDate && r.dueDate.getTime() < now)
    .reduce((s, r) => s + (r.amount.toNumber() - r.paidAmount.toNumber()), 0);

  const lastBill = bills[bills.length - 1];
  const lastPayment = payments[payments.length - 1];

  // Average payment days — for payments allocated to a bill, the gap between bill and payment.
  const billById = new Map(bills.map((b) => [b.id, b]));
  const linked = payments.filter((p) => p.billId && billById.has(p.billId));
  const averagePaymentDays = linked.length > 0
    ? Math.round(
        linked.reduce((s, p) => s + (p.paymentDate.getTime() - billById.get(p.billId as string)!.createdAt.getTime()) / 86_400_000, 0) /
          linked.length,
      )
    : null;

  const creditLimit = supplier.creditLimit != null ? supplier.creditLimit.toNumber() : null;

  return {
    supplierId: supplier.id,
    name: supplier.name,
    code: supplier.code,
    transactions: built.lines,
    outstandingBalance,
    overdueAmount: Math.max(0, overdueAmount),
    totalPurchased,
    totalPaid,
    lastBill: lastBill ? { reference: lastBill.code, date: lastBill.createdAt, amount: lastBill.totalAmount.toNumber() } : null,
    lastPayment: lastPayment ? { date: lastPayment.paymentDate, amount: lastPayment.amount.toNumber() } : null,
    creditLimit,
    availableCredit: creditLimit != null ? creditLimit - outstandingBalance : null,
    averagePaymentDays,
  };
}
