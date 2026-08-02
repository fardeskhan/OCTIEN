/**
 * Receivables Aging — built directly on the `ReceivableEntry` AR subledger (the same source the
 * Customer Ledger reconciles against), NOT by recomputing from invoices. Buckets open receivables
 * by days past due and rolls them up per customer with collection KPIs.
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

export interface CustomerAging extends AgingBuckets {
  customerId: string;
  name: string;
  code: string;
  total: number;
  overdue: number;
}

export interface ReceivablesAging {
  totals: AgingBuckets & { total: number; overdue: number };
  perCustomer: CustomerAging[];
  topOverdue: CustomerAging[];
  monthlyCollections: { month: string; amount: number }[];
  kpis: {
    outstanding: number;
    overdue: number;
    collectionRate: number | null; // 0..1
    avgDaysOutstanding: number | null; // DSO, amount-weighted days since invoice
    expectedCollections: number; // current + 1–30 near-term
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

export async function getReceivablesAging(businessId: string): Promise<ReceivablesAging> {
  const [receivables, invoices, payments] = await Promise.all([
    db.receivableEntry.findMany({
      where: { businessId, sourceType: "CUSTOMER_INVOICE", status: { in: ["OPEN", "PARTIALLY_PAID"] } },
      include: { customer: { select: { name: true, code: true } } },
    }),
    db.customerInvoice.findMany({ where: { businessId, deletedAt: null }, select: { id: true, createdAt: true, totalAmount: true } }),
    db.customerPayment.findMany({ where: { businessId }, select: { amount: true, paymentDate: true } }),
  ]);

  const invoiceDate = new Map(invoices.map((i) => [i.id, i.createdAt]));
  const now = Date.now();

  const totals = { ...emptyBuckets(), total: 0, overdue: 0 };
  const perCustMap = new Map<string, CustomerAging>();
  let dsoWeighted = 0;
  let dsoWeight = 0;

  for (const r of receivables) {
    const outstanding = r.amount.toNumber() - r.paidAmount.toNumber();
    if (outstanding <= 0.01) continue;

    const customerId = r.customerId ?? "unassigned";
    let row = perCustMap.get(customerId);
    if (!row) {
      row = { customerId, name: r.customer?.name ?? "—", code: r.customer?.code ?? "—", ...emptyBuckets(), total: 0, overdue: 0 };
      perCustMap.set(customerId, row);
    }

    const daysPastDue = r.dueDate ? Math.floor((now - r.dueDate.getTime()) / DAY) : 0;
    const bucket = bucketFor(daysPastDue);
    row[bucket] += outstanding;
    row.total += outstanding;
    totals[bucket] += outstanding;
    totals.total += outstanding;
    if (daysPastDue > 0) {
      row.overdue += outstanding;
      totals.overdue += outstanding;
    }

    const invDate = invoiceDate.get(r.sourceId);
    if (invDate) {
      dsoWeighted += ((now - invDate.getTime()) / DAY) * outstanding;
      dsoWeight += outstanding;
    }
  }

  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount.toNumber(), 0);
  const totalReceived = payments.reduce((s, p) => s + p.amount.toNumber(), 0);

  // Monthly collections — last 6 calendar months.
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

  const perCustomer = [...perCustMap.values()].sort((a, b) => b.total - a.total);
  const topOverdue = perCustomer.filter((c) => c.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 5);

  return {
    totals,
    perCustomer,
    topOverdue,
    monthlyCollections: monthDefs.map((m) => ({ month: m.label, amount: Math.round(m.amount) })),
    kpis: {
      outstanding: totals.total,
      overdue: totals.overdue,
      collectionRate: totalInvoiced > 0 ? totalReceived / totalInvoiced : null,
      avgDaysOutstanding: dsoWeight > 0 ? Math.round(dsoWeighted / dsoWeight) : null,
      expectedCollections: totals.current + totals.d1_30,
    },
  };
}
