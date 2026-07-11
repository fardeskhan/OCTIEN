import { db } from "@/lib/db";

export interface AgingBucket {
  label: string;
  amount: number;
}
export interface TopEntry {
  name: string;
  value: number;
  sub?: string;
}
export interface GroupAnalytics {
  arAging: AgingBucket[];
  apAging: AgingBucket[];
  topCustomers: TopEntry[];
  topProducts: TopEntry[];
}

export interface ActivityItem {
  when: Date;
  actor: string;
  action: string;
  resource: string;
  business: string;
  detail: string;
}
export interface RecentDoc {
  kind: string;
  code: string;
  href: string;
  party: string;
  amount: number;
  when: Date;
}

/** Recent activity (audit log) + recent documents (invoices, POs, sales orders) across the tenant. */
export async function getActivityAndDocs(tenantId: string): Promise<{ activity: ActivityItem[]; docs: RecentDoc[] }> {
  const businesses = await db.business.findMany({ where: { tenantId }, select: { id: true, name: true } });
  const ids = businesses.map((b) => b.id);
  const bizName = new Map(businesses.map((b) => [b.id, b.name]));

  const [audit, invoices, pos, sos] = await Promise.all([
    db.auditLog.findMany({ where: { tenantId }, orderBy: { occurredAt: "desc" }, take: 8 }),
    db.customerInvoice.findMany({ where: { businessId: { in: ids }, deletedAt: null }, include: { customer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 4 }),
    db.purchaseOrder.findMany({ where: { businessId: { in: ids } }, include: { supplier: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.salesOrder.findMany({ where: { businessId: { in: ids } }, include: { customer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  const actorIds = [...new Set(audit.map((a) => a.actorId))];
  const actors = await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const actorName = new Map(actors.map((a) => [a.id, a.name]));

  const activity: ActivityItem[] = audit.map((a) => {
    const meta = (a.metadata ?? {}) as Record<string, unknown>;
    const detail = (meta.code as string) ?? (meta.name as string) ?? (meta.count ? `${meta.count} records` : "");
    return {
      when: a.occurredAt,
      actor: actorName.get(a.actorId) ?? "System",
      action: a.action.replace(/_/g, " "),
      resource: a.resource.replace(/_/g, " "),
      business: a.businessId ? bizName.get(a.businessId) ?? "" : "Tenant",
      detail: String(detail),
    };
  });

  const docs: RecentDoc[] = [
    ...invoices.map((i) => ({ kind: "Invoice", code: i.code, href: `/sales/invoices/${i.id}`, party: i.customer.name, amount: i.totalAmount.toNumber(), when: i.createdAt })),
    ...pos.map((p) => ({ kind: "Purchase Order", code: p.code, href: "/operations/procurement/orders", party: p.supplier.name, amount: p.totalAmount, when: p.createdAt })),
    ...sos.map((s) => ({ kind: "Sales Order", code: s.code, href: "/sales/orders", party: s.customer.name, amount: s.totalAmount, when: s.createdAt })),
  ]
    .sort((a, b) => b.when.getTime() - a.when.getTime())
    .slice(0, 8);

  return { activity, docs };
}

function bucketize(entries: { remaining: number; dueDate: Date | null }[]): AgingBucket[] {
  const now = Date.now();
  const b = { current: 0, d30: 0, d60: 0, d90: 0 };
  for (const e of entries) {
    if (e.remaining <= 0) continue;
    const days = e.dueDate ? Math.floor((now - e.dueDate.getTime()) / 86400000) : 0;
    if (days <= 0) b.current += e.remaining;
    else if (days <= 30) b.d30 += e.remaining;
    else if (days <= 60) b.d60 += e.remaining;
    else b.d90 += e.remaining;
  }
  return [
    { label: "Current", amount: Math.round(b.current) },
    { label: "1–30 days", amount: Math.round(b.d30) },
    { label: "31–60 days", amount: Math.round(b.d60) },
    { label: "60+ days", amount: Math.round(b.d90) },
  ];
}

/** Group-wide analytics computed live across every business in the tenant. */
export async function getGroupAnalytics(tenantId: string): Promise<GroupAnalytics> {
  const businesses = await db.business.findMany({ where: { tenantId }, select: { id: true } });
  const ids = businesses.map((b) => b.id);
  if (ids.length === 0) return { arAging: [], apAging: [], topCustomers: [], topProducts: [] };

  const [receivables, payables, projections] = await Promise.all([
    db.receivableEntry.findMany({
      where: { businessId: { in: ids }, status: { not: "CLOSED" } },
      include: { customer: { select: { name: true } } },
    }),
    db.payableEntry.findMany({ where: { businessId: { in: ids }, status: { not: "PAID" } } }),
    db.inventoryVariantProjection.findMany({ where: { businessId: { in: ids } } }),
  ]);

  const arRows = receivables.map((r) => ({ remaining: r.amount.toNumber() - r.paidAmount.toNumber(), dueDate: r.dueDate, name: r.customer?.name ?? "—" }));
  const apRows = payables.map((p) => ({ remaining: p.amount.toNumber() - p.paidAmount.toNumber(), dueDate: p.dueDate }));

  // Top customers by open receivable balance.
  const byCustomer = new Map<string, number>();
  for (const r of arRows) byCustomer.set(r.name, (byCustomer.get(r.name) ?? 0) + Math.max(r.remaining, 0));
  const topCustomers = [...byCustomer.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Top products by inventory value (on-hand × average cost).
  const variantIds = [...new Set(projections.map((p) => p.variantId))];
  const variants = await db.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, name: true } });
  const nameByVariant = new Map(variants.map((v) => [v.id, v.name]));
  const byProduct = new Map<string, number>();
  for (const p of projections) {
    const name = nameByVariant.get(p.variantId) ?? "—";
    byProduct.set(name, (byProduct.get(name) ?? 0) + p.onHandQuantity * p.averageCost.toNumber());
  }
  const topProducts = [...byProduct.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    arAging: bucketize(arRows),
    apAging: bucketize(apRows),
    topCustomers,
    topProducts,
  };
}
