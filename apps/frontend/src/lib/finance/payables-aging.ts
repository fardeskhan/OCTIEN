/**
 * Payables (AP) Aging — the AP mirror of `receivables-aging`, built on the `PayableEntry` subledger
 * (joined to supplier bills for the supplier + bill date). Buckets open payables by days past due.
 */
import { db } from "@/lib/db";

const DAY = 86_400_000;

export interface AgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d91_120: number;
  d120plus: number;
}

export interface SupplierAging extends AgingBuckets {
  supplierId: string;
  name: string;
  code: string;
  total: number;
  overdue: number;
}

export interface PayablesAging {
  totals: AgingBuckets & { total: number; overdue: number };
  perSupplier: SupplierAging[];
  topOverdue: SupplierAging[];
  monthlyPayments: { month: string; amount: number }[];
  kpis: {
    outstanding: number;
    overdue: number;
    paymentRate: number | null;
    avgDaysOutstanding: number | null;
    expectedPayments: number;
  };
}

const emptyBuckets = (): AgingBuckets => ({ current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0 });

function bucketFor(daysPastDue: number): keyof AgingBuckets {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "d1_30";
  if (daysPastDue <= 60) return "d31_60";
  if (daysPastDue <= 90) return "d61_90";
  if (daysPastDue <= 120) return "d91_120";
  return "d120plus";
}

export async function getPayablesAging(businessId: string): Promise<PayablesAging> {
  const [payables, bills, suppliers, payments] = await Promise.all([
    db.payableEntry.findMany({ where: { businessId, sourceType: "SUPPLIER_BILL", status: { in: ["OPEN", "PARTIAL"] } } }),
    db.supplierBill.findMany({ where: { businessId, deletedAt: null }, select: { id: true, supplierId: true, createdAt: true, totalAmount: true, paidAmount: true } }),
    db.supplier.findMany({ where: { businessId, deletedAt: null }, select: { id: true, name: true, code: true } }),
    db.supplierPayment.findMany({ where: { businessId }, select: { amount: true, paymentDate: true } }),
  ]);

  const billById = new Map(bills.map((b) => [b.id, b]));
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));
  const now = Date.now();

  const totals = { ...emptyBuckets(), total: 0, overdue: 0 };
  const perMap = new Map<string, SupplierAging>();
  let dsoWeighted = 0;
  let dsoWeight = 0;

  for (const p of payables) {
    const outstanding = p.amount.toNumber() - p.paidAmount.toNumber();
    if (outstanding <= 0.01) continue;
    const bill = billById.get(p.sourceId);
    const supplierId = bill?.supplierId ?? "unassigned";
    const sup = supplierById.get(supplierId);

    let row = perMap.get(supplierId);
    if (!row) {
      row = { supplierId, name: sup?.name ?? "—", code: sup?.code ?? "—", ...emptyBuckets(), total: 0, overdue: 0 };
      perMap.set(supplierId, row);
    }

    const daysPastDue = p.dueDate ? Math.floor((now - p.dueDate.getTime()) / DAY) : 0;
    const bucket = bucketFor(daysPastDue);
    row[bucket] += outstanding;
    row.total += outstanding;
    totals[bucket] += outstanding;
    totals.total += outstanding;
    if (daysPastDue > 0) {
      row.overdue += outstanding;
      totals.overdue += outstanding;
    }

    if (bill) {
      dsoWeighted += ((now - bill.createdAt.getTime()) / DAY) * outstanding;
      dsoWeight += outstanding;
    }
  }

  const totalBilled = bills.reduce((s, b) => s + b.totalAmount.toNumber(), 0);
  const totalPaid = bills.reduce((s, b) => s + b.paidAmount.toNumber(), 0);

  const monthDefs: { key: string; label: string; amount: number }[] = [];
  const base = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    monthDefs.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-IN", { month: "short" }), amount: 0 });
  }
  const monthIndex = new Map(monthDefs.map((m, i) => [m.key, i]));
  for (const p of payments) {
    const idx = monthIndex.get(`${p.paymentDate.getFullYear()}-${p.paymentDate.getMonth()}`);
    if (idx !== undefined) monthDefs[idx].amount += p.amount.toNumber();
  }

  const perSupplier = [...perMap.values()].sort((a, b) => b.total - a.total);
  const topOverdue = perSupplier.filter((s) => s.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 5);

  return {
    totals,
    perSupplier,
    topOverdue,
    monthlyPayments: monthDefs.map((m) => ({ month: m.label, amount: Math.round(m.amount) })),
    kpis: {
      outstanding: totals.total,
      overdue: totals.overdue,
      paymentRate: totalBilled > 0 ? totalPaid / totalBilled : null,
      avgDaysOutstanding: dsoWeight > 0 ? Math.round(dsoWeighted / dsoWeight) : null,
      expectedPayments: totals.current + totals.d1_30,
    },
  };
}
