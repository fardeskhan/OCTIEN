/**
 * ProcurementDashboardService — thin ORCHESTRATION layer (mirror of the Sales dashboard). Composes
 * existing services + aggregate queries into widget DTOs. Does NOT recompute outstanding / overdue
 * / payables (those come from `getPayablesAging`, which reconciles against the AP subledger).
 */
import { db } from "@/lib/db";
import { getPayablesAging, type PayablesAging } from "@/lib/finance/payables-aging";

export interface ProcurementDashboardDTO {
  kpis: {
    purchaseSpend: number;
    purchaseOrders: number;
    goodsReceipts: number;
    vendorBills: number;
    payments: number;
    outstandingAP: number;
    overdueAP: number;
    avgPaymentDays: number | null;
  };
  trends: { month: string; purchases: number; bills: number; paid: number }[];
  aging: PayablesAging;
  operations: {
    pendingRequisitions: number;
    pendingPurchaseOrders: number;
    pendingReceipts: number;
    billsAwaitingApproval: number;
  };
  topSuppliers: { name: string; amount: number }[];
  largestOutstanding: { name: string; amount: number }[];
  recentPurchases: { code: string; supplier: string; amount: number; status: string }[];
  alerts: { label: string; value: string; tone: "danger" | "warning" | "info" }[];
}

export async function getProcurementDashboard(businessId: string): Promise<ProcurementDashboardDTO> {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    billAgg, poCount, grCount, aging,
    billsForTrend, topSupGrouped, recentBills,
    pendingRequisitions, pendingPurchaseOrders, pendingReceipts, billsAwaitingApproval,
    failedEvents, negativeStock,
  ] = await Promise.all([
    db.supplierBill.aggregate({ where: { businessId, deletedAt: null }, _sum: { totalAmount: true, paidAmount: true }, _count: true }),
    db.purchaseOrder.count({ where: { businessId } }),
    db.goodsReceiptRequest.count({ where: { businessId } }),
    getPayablesAging(businessId),
    db.supplierBill.findMany({ where: { businessId, deletedAt: null, createdAt: { gte: sixMonthsAgo } }, select: { totalAmount: true, paidAmount: true, createdAt: true } }),
    db.supplierBill.groupBy({ by: ["supplierId"], where: { businessId, deletedAt: null }, _sum: { totalAmount: true } }),
    db.supplierBill.findMany({ where: { businessId, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8, include: { supplier: { select: { name: true } } } }),
    db.purchaseRequisition.count({ where: { businessId, status: { in: ["DRAFT", "SUBMITTED"] } } }),
    db.purchaseOrder.count({ where: { businessId, status: { in: ["DRAFT", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED"] } } }),
    db.goodsReceiptRequest.count({ where: { businessId, status: { in: ["REQUESTED", "PROCESSING"] } } }),
    db.supplierBill.count({ where: { businessId, deletedAt: null, status: { in: ["DRAFT", "PENDING_APPROVAL"] } } }),
    db.outboxEventRecord.count({ where: { businessId, status: "FAILED" } }),
    db.inventoryVariantProjection.count({ where: { businessId, availableQuantity: { lt: 0 } } }),
  ]);

  const purchaseSpend = billAgg._sum.totalAmount?.toNumber() ?? 0;
  const payments = billAgg._sum.paidAmount?.toNumber() ?? 0;

  // Trends — last 6 months.
  const monthDefs: { key: string; label: string; purchases: number; bills: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthDefs.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-IN", { month: "short" }), purchases: 0, bills: 0 });
  }
  const monthIndex = new Map(monthDefs.map((m, i) => [m.key, i]));
  for (const b of billsForTrend) {
    const idx = monthIndex.get(`${b.createdAt.getFullYear()}-${b.createdAt.getMonth()}`);
    if (idx !== undefined) {
      monthDefs[idx].purchases += b.totalAmount.toNumber();
      monthDefs[idx].bills += 1;
    }
  }
  const paidByMonth = new Map(aging.monthlyPayments.map((m) => [m.month, m.amount]));
  const trends = monthDefs.map((m) => ({ month: m.label, purchases: Math.round(m.purchases), bills: m.bills, paid: paidByMonth.get(m.label) ?? 0 }));

  // Top suppliers by spend.
  const topSorted = [...topSupGrouped].sort((a, b) => (b._sum.totalAmount?.toNumber() ?? 0) - (a._sum.totalAmount?.toNumber() ?? 0)).slice(0, 5);
  const supNames = new Map(
    (await db.supplier.findMany({ where: { id: { in: topSorted.map((g) => g.supplierId) } }, select: { id: true, name: true } })).map((s) => [s.id, s.name]),
  );
  const topSuppliers = topSorted.map((g) => ({ name: supNames.get(g.supplierId) ?? "—", amount: Math.round(g._sum.totalAmount?.toNumber() ?? 0) }));

  const largestOutstanding = aging.perSupplier.slice(0, 5).map((s) => ({ name: s.name, amount: Math.round(s.total) }));

  const recentPurchases = recentBills.map((b) => ({ code: b.code, supplier: b.supplier?.name ?? "—", amount: Math.round(b.totalAmount.toNumber()), status: b.status }));

  const alerts: ProcurementDashboardDTO["alerts"] = [];
  if (aging.kpis.overdue > 0) alerts.push({ label: "Overdue payables", value: `₹${Math.round(aging.kpis.overdue).toLocaleString("en-IN")}`, tone: "danger" });
  if (failedEvents > 0) alerts.push({ label: "Failed procurement events", value: String(failedEvents), tone: "danger" });
  if (negativeStock > 0) alerts.push({ label: "Negative stock lines", value: String(negativeStock), tone: "danger" });
  if (billsAwaitingApproval > 0) alerts.push({ label: "Bills awaiting approval", value: String(billsAwaitingApproval), tone: "warning" });
  if (pendingReceipts > 0) alerts.push({ label: "Receipts pending", value: String(pendingReceipts), tone: "info" });

  return {
    kpis: {
      purchaseSpend,
      purchaseOrders: poCount,
      goodsReceipts: grCount,
      vendorBills: billAgg._count,
      payments,
      outstandingAP: aging.kpis.outstanding,
      overdueAP: aging.kpis.overdue,
      avgPaymentDays: aging.kpis.avgDaysOutstanding,
    },
    trends,
    aging,
    operations: { pendingRequisitions, pendingPurchaseOrders, pendingReceipts, billsAwaitingApproval },
    topSuppliers,
    largestOutstanding,
    recentPurchases,
    alerts,
  };
}
