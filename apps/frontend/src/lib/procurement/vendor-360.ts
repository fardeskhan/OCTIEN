/**
 * Vendor 360 — the AP mirror of Customer 360. INTEGRATION only: it composes existing services
 * (Vendor Ledger, Payables Aging) and activity queries into one operational picture. No business
 * logic (outstanding / overdue / aging) is recomputed here.
 *
 * Note: PurchaseRequisition is vendor-agnostic (no supplierId), so requisitions are not attributed
 * to a supplier here.
 */
import { db } from "@/lib/db";
import { getVendorLedger, type VendorLedgerTxn } from "@/lib/finance/vendor-ledger";
import { getPayablesAging, type SupplierAging } from "@/lib/finance/payables-aging";

export interface TimelineEvent {
  date: Date;
  type: string;
  label: string;
}

export interface Vendor360 {
  supplier: { id: string; name: string; code: string; status: string; since: Date };
  summary: {
    outstanding: number;
    overdue: number;
    creditLimit: number | null;
    availableCredit: number | null;
    averagePaymentDays: number | null;
    totalPurchased: number;
    totalPaid: number;
  };
  activity: { purchaseOrders: number; goodsReceipts: number; bills: number; payments: number };
  ledgerRecent: VendorLedgerTxn[];
  aging: SupplierAging | null;
  recentPayments: { date: Date; reference: string; amount: number }[];
  openPurchaseOrders: { code: string; status: string; total: number; href: string }[];
  pendingReceipts: { code: string; status: string }[];
  billsAwaitingApproval: { code: string; status: string }[];
  topProducts: { product: string; qty: number; amount: number }[];
  timeline: TimelineEvent[];
}

export async function getVendor360(businessId: string, supplierId: string): Promise<Vendor360 | null> {
  const supplier = await db.supplier.findFirst({ where: { id: supplierId, businessId, deletedAt: null } });
  if (!supplier) return null;

  const [ledger, aging, pos, receipts, bills, payments, poLines] = await Promise.all([
    getVendorLedger(businessId, supplierId),
    getPayablesAging(businessId),
    db.purchaseOrder.findMany({ where: { businessId, supplierId }, select: { id: true, code: true, createdAt: true, status: true, totalAmount: true } }),
    db.goodsReceiptRequest.findMany({ where: { businessId, purchaseOrder: { supplierId } }, select: { id: true, code: true, receivedAt: true, status: true } }),
    db.supplierBill.findMany({ where: { businessId, supplierId, deletedAt: null }, select: { id: true, code: true, createdAt: true, status: true, totalAmount: true } }),
    db.supplierPayment.findMany({ where: { businessId, bill: { supplierId } }, orderBy: { paymentDate: "desc" }, select: { paymentDate: true, amount: true, reference: true } }),
    db.purchaseOrderLine.findMany({ where: { purchaseOrder: { businessId, supplierId } }, select: { quantity: true, totalPrice: true, variant: { select: { name: true, product: { select: { name: true } } } } } }),
  ]);

  const supAging = aging.perSupplier.find((s) => s.supplierId === supplierId) ?? null;

  // Top products (from this supplier's PO lines).
  const prodMap = new Map<string, { product: string; qty: number; amount: number }>();
  for (const l of poLines) {
    const product = l.variant.product?.name ?? l.variant.name;
    const e = prodMap.get(product) ?? { product, qty: 0, amount: 0 };
    e.qty += l.quantity;
    e.amount += l.totalPrice;
    prodMap.set(product, e);
  }
  const topProducts = [...prodMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 5).map((p) => ({ product: p.product, qty: Math.round(p.qty), amount: Math.round(p.amount) }));

  // Merge every source into one chronological timeline (+ audit).
  const events: TimelineEvent[] = [];
  for (const o of pos) events.push({ date: o.createdAt, type: "Order", label: `Purchase order ${o.code} created` });
  for (const r of receipts) if (r.receivedAt) events.push({ date: r.receivedAt, type: "Receipt", label: `Goods receipt ${r.code} ${r.status.toLowerCase()}` });
  for (const b of bills) events.push({ date: b.createdAt, type: "Bill", label: `Vendor bill ${b.code} raised` });
  for (const p of payments) events.push({ date: p.paymentDate, type: "Payment", label: `Payment of ₹${Math.round(p.amount.toNumber()).toLocaleString("en-IN")} made` });

  const auditIds = [...pos.map((o) => o.id), ...receipts.map((r) => r.id), ...bills.map((b) => b.id)];
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
    supplier: { id: supplier.id, name: supplier.name, code: supplier.code, status: supplier.status, since: supplier.createdAt },
    summary: {
      outstanding: ledger?.outstandingBalance ?? 0,
      overdue: ledger?.overdueAmount ?? 0,
      creditLimit: ledger?.creditLimit ?? null,
      availableCredit: ledger?.availableCredit ?? null,
      averagePaymentDays: ledger?.averagePaymentDays ?? null,
      totalPurchased: ledger?.totalPurchased ?? 0,
      totalPaid: ledger?.totalPaid ?? 0,
    },
    activity: { purchaseOrders: pos.length, goodsReceipts: receipts.length, bills: bills.length, payments: payments.length },
    ledgerRecent: (ledger?.transactions ?? []).slice(-8).reverse(),
    aging: supAging,
    recentPayments: payments.slice(0, 5).map((p) => ({ date: p.paymentDate, reference: p.reference ?? "—", amount: Math.round(p.amount.toNumber()) })),
    openPurchaseOrders: pos.filter((o) => o.status !== "RECEIVED" && o.status !== "CLOSED" && o.status !== "CANCELLED").slice(0, 5).map((o) => ({ code: o.code, status: o.status, total: Math.round(o.totalAmount), href: "/procurement/dashboard" })),
    pendingReceipts: receipts.filter((r) => r.status === "REQUESTED" || r.status === "PROCESSING").slice(0, 5).map((r) => ({ code: r.code, status: r.status })),
    billsAwaitingApproval: bills.filter((b) => b.status === "DRAFT" || b.status === "PENDING_APPROVAL").slice(0, 5).map((b) => ({ code: b.code, status: b.status })),
    topProducts,
    timeline: events.slice(0, 30),
  };
}
