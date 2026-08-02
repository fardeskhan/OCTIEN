/**
 * Customer 360 — an INTEGRATION view. It composes existing services (Customer Ledger, Receivables
 * Aging) and a few activity queries into one operational picture. It deliberately does not
 * recompute outstanding / overdue / aging / DSO — those come from the domain services.
 */
import { db } from "@/lib/db";
import { getCustomerLedger, type LedgerTxn } from "@/lib/finance/customer-ledger";
import { getReceivablesAging, type CustomerAging } from "@/lib/finance/receivables-aging";

export interface TimelineEvent {
  date: Date;
  type: string;
  label: string;
}

export interface Customer360 {
  customer: { id: string; name: string; code: string; status: string; creditStatus: string; since: Date };
  summary: {
    outstanding: number;
    overdue: number;
    availableCredit: number | null;
    collectionRate: number | null;
    dso: number | null;
    revenueYtd: number;
  };
  activity: { quotations: number; orders: number; shipments: number; invoices: number; payments: number };
  ledgerRecent: LedgerTxn[];
  aging: CustomerAging | null;
  recentPayments: { date: Date; reference: string; amount: number }[];
  openOrders: { code: string; status: string; total: number; href: string }[];
  pendingShipments: { code: string; status: string; href: string }[];
  recentDeliveries: { code: string; status: string; href: string }[];
  topProducts: { product: string; qty: number; amount: number }[];
  timeline: TimelineEvent[];
}

export async function getCustomer360(businessId: string, customerId: string): Promise<Customer360 | null> {
  const customer = await db.customer.findFirst({ where: { id: customerId, businessId, deletedAt: null } });
  if (!customer) return null;

  const [ledger, aging, quotations, orders, shipments, invoices, payments, orderLines] = await Promise.all([
    getCustomerLedger(businessId, customerId),
    getReceivablesAging(businessId),
    db.quotation.findMany({ where: { businessId, customerId }, select: { id: true, code: true, createdAt: true, status: true } }),
    db.salesOrder.findMany({ where: { businessId, customerId }, select: { id: true, code: true, createdAt: true, status: true, totalAmount: true } }),
    db.shipment.findMany({ where: { businessId, salesOrder: { customerId } }, select: { id: true, code: true, createdAt: true, updatedAt: true, status: true } }),
    db.customerInvoice.findMany({ where: { businessId, customerId, deletedAt: null }, select: { id: true, code: true, createdAt: true, status: true, totalAmount: true } }),
    db.customerPayment.findMany({ where: { businessId, customerId }, orderBy: { paymentDate: "desc" }, select: { paymentDate: true, amount: true, reference: true } }),
    db.salesOrderLine.findMany({ where: { salesOrder: { businessId, customerId } }, select: { quantity: true, totalPrice: true, variant: { select: { name: true, product: { select: { name: true } } } } } }),
  ]);

  const custAging = aging.perCustomer.find((c) => c.customerId === customerId) ?? null;

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const revenueYtd = invoices.filter((i) => i.createdAt >= yearStart).reduce((s, i) => s + i.totalAmount.toNumber(), 0);
  const totalInvoiced = ledger?.totalInvoiced ?? 0;
  const collectionRate = totalInvoiced > 0 ? (ledger?.totalPaid ?? 0) / totalInvoiced : null;

  // Top products for this customer.
  const prodMap = new Map<string, { product: string; qty: number; amount: number }>();
  for (const l of orderLines) {
    const product = l.variant.product?.name ?? l.variant.name;
    const e = prodMap.get(product) ?? { product, qty: 0, amount: 0 };
    e.qty += l.quantity;
    e.amount += l.totalPrice;
    prodMap.set(product, e);
  }
  const topProducts = [...prodMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 5).map((p) => ({ product: p.product, qty: Math.round(p.qty), amount: Math.round(p.amount) }));

  // Merge every source into one chronological timeline (+ audit for these entities).
  const events: TimelineEvent[] = [];
  for (const q of quotations) events.push({ date: q.createdAt, type: "Quotation", label: `Quotation ${q.code} created` });
  for (const o of orders) events.push({ date: o.createdAt, type: "Order", label: `Sales order ${o.code} created` });
  for (const s of shipments) {
    events.push({ date: s.createdAt, type: "Shipment", label: `Shipment ${s.code} created` });
    if (s.status === "DISPATCHED" || s.status === "DELIVERED") events.push({ date: s.updatedAt, type: "Dispatch", label: `Shipment ${s.code} ${s.status.toLowerCase()}` });
  }
  for (const i of invoices) events.push({ date: i.createdAt, type: "Invoice", label: `Invoice ${i.code} issued` });
  for (const p of payments) events.push({ date: p.paymentDate, type: "Payment", label: `Payment of ₹${Math.round(p.amount.toNumber()).toLocaleString("en-IN")} received` });

  const auditIds = [...quotations.map((q) => q.id), ...orders.map((o) => o.id), ...shipments.map((s) => s.id), ...invoices.map((i) => i.id)];
  if (auditIds.length > 0) {
    const audits = await db.auditLog.findMany({
      where: { businessId, resourceId: { in: auditIds } },
      orderBy: { occurredAt: "desc" },
      take: 40,
      select: { action: true, resource: true, occurredAt: true },
    });
    for (const a of audits) events.push({ date: a.occurredAt, type: "Audit", label: `${a.resource.replace(/_/g, " ")} — ${a.action}` });
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    customer: { id: customer.id, name: customer.name, code: customer.code, status: customer.status, creditStatus: customer.creditStatus, since: customer.createdAt },
    summary: {
      outstanding: ledger?.outstandingBalance ?? 0,
      overdue: ledger?.overdueAmount ?? 0,
      availableCredit: null, // customer credit limits not modeled yet
      collectionRate,
      dso: ledger?.averageCollectionDays ?? null,
      revenueYtd: Math.round(revenueYtd),
    },
    activity: { quotations: quotations.length, orders: orders.length, shipments: shipments.length, invoices: invoices.length, payments: payments.length },
    ledgerRecent: (ledger?.transactions ?? []).slice(-8).reverse(),
    aging: custAging,
    recentPayments: payments.slice(0, 5).map((p) => ({ date: p.paymentDate, reference: p.reference ?? "—", amount: Math.round(p.amount.toNumber()) })),
    openOrders: orders.filter((o) => o.status !== "FULFILLED" && o.status !== "CANCELLED").slice(0, 5).map((o) => ({ code: o.code, status: o.status, total: Math.round(o.totalAmount), href: `/sales/orders/${o.id}` })),
    pendingShipments: shipments.filter((s) => s.status !== "DELIVERED" && s.status !== "CANCELLED").slice(0, 5).map((s) => ({ code: s.code, status: s.status, href: `/sales/deliveries/${s.id}` })),
    recentDeliveries: shipments.filter((s) => s.status === "DELIVERED").slice(0, 5).map((s) => ({ code: s.code, status: s.status, href: `/sales/deliveries/${s.id}` })),
    topProducts,
    timeline: events.slice(0, 30),
  };
}
