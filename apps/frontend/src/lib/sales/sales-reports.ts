/**
 * Sales report data — plain aggregate/list queries over existing sales & accounting data. Each
 * function returns rows ready for `EnterpriseReportTable`. No business logic is recomputed here
 * that a domain service already owns (receivables come from the ledger/aging services).
 */
import { db } from "@/lib/db";

const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export async function getInvoiceRegister(businessId: string) {
  const invoices = await db.customerInvoice.findMany({
    where: { businessId, deletedAt: null },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return invoices.map((i) => ({
    code: i.code,
    date: fmtDate(i.createdAt),
    customer: i.customer?.name ?? "—",
    total: Math.round(i.totalAmount.toNumber()),
    paid: Math.round(i.paidAmount.toNumber()),
    remaining: Math.round(i.remainingAmount.toNumber()),
    status: i.status,
  }));
}

export async function getShipmentRegister(businessId: string) {
  const shipments = await db.shipment.findMany({
    where: { businessId, deletedAt: null },
    include: { salesOrder: { select: { code: true, customer: { select: { name: true } } } }, warehouse: { select: { name: true } }, lines: true },
    orderBy: { createdAt: "desc" },
  });
  return shipments.map((s) => ({
    code: s.code,
    date: fmtDate(s.createdAt),
    so: s.salesOrder?.code ?? "—",
    customer: s.salesOrder?.customer?.name ?? "—",
    warehouse: s.warehouse?.name ?? "—",
    status: s.status,
    qty: Math.round(s.lines.reduce((t, l) => t + l.shippedQty, 0)),
  }));
}

export async function getPaymentRegister(businessId: string) {
  const payments = await db.customerPayment.findMany({
    where: { businessId },
    include: { customer: { select: { name: true } } },
    orderBy: { paymentDate: "desc" },
  });
  return payments.map((p) => ({
    date: fmtDate(p.paymentDate),
    reference: p.reference ?? "—",
    customer: p.customer?.name ?? "—",
    amount: Math.round(p.amount.toNumber()),
    method: p.method,
  }));
}

export async function getCustomerSales(businessId: string) {
  const [invGroup, payGroup, recvGroup, customers] = await Promise.all([
    db.customerInvoice.groupBy({ by: ["customerId"], where: { businessId, deletedAt: null }, _sum: { totalAmount: true }, _count: true }),
    db.customerPayment.groupBy({ by: ["customerId"], where: { businessId }, _sum: { amount: true } }),
    db.receivableEntry.groupBy({ by: ["customerId"], where: { businessId, sourceType: "CUSTOMER_INVOICE", status: { in: ["OPEN", "PARTIALLY_PAID"] } }, _sum: { amount: true, paidAmount: true } }),
    db.customer.findMany({ where: { businessId, deletedAt: null }, select: { id: true, name: true } }),
  ]);
  const nameById = new Map(customers.map((c) => [c.id, c.name]));
  const payBy = new Map(payGroup.map((g) => [g.customerId, g._sum.amount?.toNumber() ?? 0]));
  const outBy = new Map(recvGroup.map((g) => [g.customerId, (g._sum.amount?.toNumber() ?? 0) - (g._sum.paidAmount?.toNumber() ?? 0)]));
  return invGroup
    .filter((g) => g.customerId)
    .map((g) => ({
      customer: nameById.get(g.customerId as string) ?? "—",
      invoices: g._count,
      invoiced: Math.round(g._sum.totalAmount?.toNumber() ?? 0),
      received: Math.round(payBy.get(g.customerId) ?? 0),
      outstanding: Math.round(outBy.get(g.customerId) ?? 0),
    }))
    .sort((a, b) => b.invoiced - a.invoiced);
}

export async function getProductSales(businessId: string) {
  const lines = await db.salesOrderLine.findMany({
    where: { salesOrder: { businessId } },
    select: { quantity: true, totalPrice: true, variant: { select: { name: true, product: { select: { name: true } } } } },
  });
  const map = new Map<string, { product: string; qty: number; amount: number }>();
  for (const l of lines) {
    const product = l.variant.product?.name ?? l.variant.name;
    const e = map.get(product) ?? { product, qty: 0, amount: 0 };
    e.qty += l.quantity;
    e.amount += l.totalPrice;
    map.set(product, e);
  }
  return [...map.values()]
    .map((e) => ({ product: e.product, qty: Math.round(e.qty), amount: Math.round(e.amount) }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getMarginReport(businessId: string) {
  const lines = await db.salesOrderLine.findMany({
    where: { salesOrder: { businessId } },
    select: { quantity: true, totalPrice: true, variant: { select: { name: true, cost: true, product: { select: { name: true } } } } },
  });
  const map = new Map<string, { product: string; revenue: number; cost: number }>();
  for (const l of lines) {
    const product = l.variant.product?.name ?? l.variant.name;
    const e = map.get(product) ?? { product, revenue: 0, cost: 0 };
    e.revenue += l.totalPrice;
    e.cost += l.quantity * l.variant.cost;
    map.set(product, e);
  }
  return [...map.values()]
    .map((e) => {
      const margin = e.revenue - e.cost;
      return {
        product: e.product,
        revenue: Math.round(e.revenue),
        cost: Math.round(e.cost),
        margin: Math.round(margin),
        marginpct: e.revenue > 0 ? Math.round((margin / e.revenue) * 100) : 0,
      };
    })
    .sort((a, b) => b.margin - a.margin);
}
