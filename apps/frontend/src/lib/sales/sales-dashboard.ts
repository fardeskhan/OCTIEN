/**
 * SalesDashboardService — a thin ORCHESTRATION layer. It composes existing domain services and
 * aggregate queries into widget DTOs; it must NOT recompute outstanding / overdue / DSO /
 * collections (those come from `getReceivablesAging`, which reconciles against the AR subledger).
 */
import { db } from "@/lib/db";
import { getReceivablesAging, type ReceivablesAging } from "@/lib/finance/receivables-aging";

export interface SalesDashboardDTO {
  kpis: {
    revenue: number;
    orders: number;
    shipments: number;
    invoices: number;
    payments: number;
    outstandingAR: number;
    overdueAR: number;
    collectionRate: number | null;
    avgOrderValue: number;
  };
  trends: { month: string; revenue: number; invoices: number; collected: number }[];
  aging: ReceivablesAging;
  operations: {
    pendingQuotations: number;
    pendingOrders: number;
    picking: number;
    packing: number;
    dispatchedToday: number;
    deliveredToday: number;
  };
  topCustomers: { name: string; amount: number }[];
  topProducts: { name: string; qty: number; amount: number }[];
  largestOutstanding: { name: string; amount: number }[];
  recentSales: { code: string; customer: string; amount: number; date: Date; status: string }[];
  alerts: { label: string; value: string; tone: "danger" | "warning" | "info" }[];
}

export async function getSalesDashboard(businessId: string): Promise<SalesDashboardDTO> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    invoiceAgg, orderAgg, shipments, paymentAgg, aging,
    invoicesForTrend, topCustGrouped, orderLines, recentInvoices,
    pendingQuotations, pendingOrders, picking, packing, dispatchedToday, deliveredToday,
    failedEvents, negativeStock,
  ] = await Promise.all([
    db.customerInvoice.aggregate({ where: { businessId, deletedAt: null }, _sum: { totalAmount: true }, _count: true }),
    db.salesOrder.aggregate({ where: { businessId }, _count: true }),
    db.shipment.count({ where: { businessId, deletedAt: null } }),
    db.customerPayment.aggregate({ where: { businessId }, _sum: { amount: true }, _count: true }),
    getReceivablesAging(businessId),
    db.customerInvoice.findMany({ where: { businessId, deletedAt: null, createdAt: { gte: sixMonthsAgo } }, select: { totalAmount: true, createdAt: true } }),
    db.customerInvoice.groupBy({ by: ["customerId"], where: { businessId, deletedAt: null }, _sum: { totalAmount: true } }),
    db.salesOrderLine.findMany({ where: { salesOrder: { businessId } }, select: { quantity: true, totalPrice: true, variant: { select: { name: true, product: { select: { name: true } } } } } }),
    db.customerInvoice.findMany({ where: { businessId, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8, include: { customer: { select: { name: true } } } }),
    db.quotation.count({ where: { businessId, status: { in: ["DRAFT", "SENT"] } } }),
    db.salesOrder.count({ where: { businessId, status: { in: ["DRAFT", "APPROVED", "CONFIRMED", "PARTIALLY_FULFILLED"] } } }),
    db.shipment.count({ where: { businessId, status: "PICKING", deletedAt: null } }),
    db.shipment.count({ where: { businessId, status: "PACKING", deletedAt: null } }),
    db.shipment.count({ where: { businessId, status: "DISPATCHED", updatedAt: { gte: startOfToday }, deletedAt: null } }),
    db.shipment.count({ where: { businessId, status: "DELIVERED", updatedAt: { gte: startOfToday }, deletedAt: null } }),
    db.outboxEventRecord.count({ where: { businessId, status: "FAILED" } }),
    db.inventoryVariantProjection.count({ where: { businessId, availableQuantity: { lt: 0 } } }),
  ]);

  const revenue = invoiceAgg._sum.totalAmount?.toNumber() ?? 0;
  const orders = orderAgg._count;
  const invoices = invoiceAgg._count;
  const payments = paymentAgg._sum.amount?.toNumber() ?? 0;

  // Trends — bucket the last 6 months.
  const monthDefs: { key: string; label: string; revenue: number; invoices: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthDefs.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-IN", { month: "short" }), revenue: 0, invoices: 0 });
  }
  const monthIndex = new Map(monthDefs.map((m, i) => [m.key, i]));
  for (const inv of invoicesForTrend) {
    const idx = monthIndex.get(`${inv.createdAt.getFullYear()}-${inv.createdAt.getMonth()}`);
    if (idx !== undefined) {
      monthDefs[idx].revenue += inv.totalAmount.toNumber();
      monthDefs[idx].invoices += 1;
    }
  }
  const collectedByMonth = new Map(aging.monthlyCollections.map((m) => [m.month, m.amount]));
  const trends = monthDefs.map((m) => ({
    month: m.label,
    revenue: Math.round(m.revenue),
    invoices: m.invoices,
    collected: collectedByMonth.get(m.label) ?? 0,
  }));

  // Top customers (by invoiced amount).
  const topCustSorted = [...topCustGrouped]
    .filter((g) => g.customerId)
    .sort((a, b) => (b._sum.totalAmount?.toNumber() ?? 0) - (a._sum.totalAmount?.toNumber() ?? 0))
    .slice(0, 5);
  const custNames = new Map(
    (await db.customer.findMany({ where: { id: { in: topCustSorted.map((g) => g.customerId as string) } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]),
  );
  const topCustomers = topCustSorted.map((g) => ({ name: custNames.get(g.customerId as string) ?? "—", amount: Math.round(g._sum.totalAmount?.toNumber() ?? 0) }));

  // Top products (aggregate order lines in memory).
  const prodMap = new Map<string, { name: string; qty: number; amount: number }>();
  for (const l of orderLines) {
    const name = l.variant.product?.name ?? l.variant.name;
    const p = prodMap.get(name) ?? { name, qty: 0, amount: 0 };
    p.qty += l.quantity;
    p.amount += l.totalPrice;
    prodMap.set(name, p);
  }
  const topProducts = [...prodMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 5).map((p) => ({ name: p.name, qty: Math.round(p.qty), amount: Math.round(p.amount) }));

  const largestOutstanding = aging.perCustomer.slice(0, 5).map((c) => ({ name: c.name, amount: Math.round(c.total) }));

  const recentSales = recentInvoices.map((i) => ({
    code: i.code,
    customer: i.customer?.name ?? "—",
    amount: i.totalAmount.toNumber(),
    date: i.createdAt,
    status: i.status,
  }));

  const alerts: SalesDashboardDTO["alerts"] = [];
  if (aging.kpis.overdue > 0) alerts.push({ label: "Overdue receivables", value: `₹${Math.round(aging.kpis.overdue).toLocaleString("en-IN")}`, tone: "danger" });
  if (failedEvents > 0) alerts.push({ label: "Failed background events", value: String(failedEvents), tone: "danger" });
  if (negativeStock > 0) alerts.push({ label: "Negative stock lines", value: String(negativeStock), tone: "danger" });
  if (pendingQuotations > 0) alerts.push({ label: "Quotations awaiting action", value: String(pendingQuotations), tone: "warning" });
  if (pendingOrders > 0) alerts.push({ label: "Orders in progress", value: String(pendingOrders), tone: "info" });

  return {
    kpis: {
      revenue,
      orders,
      shipments,
      invoices,
      payments,
      outstandingAR: aging.kpis.outstanding,
      overdueAR: aging.kpis.overdue,
      collectionRate: aging.kpis.collectionRate,
      avgOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
    },
    trends,
    aging,
    operations: { pendingQuotations, pendingOrders, picking, packing, dispatchedToday, deliveredToday },
    topCustomers,
    topProducts,
    largestOutstanding,
    recentSales,
    alerts,
  };
}
