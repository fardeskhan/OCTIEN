/**
 * Procurement report data — plain list/aggregate queries for `EnterpriseReportTable`. No financial
 * values are recomputed here that a domain service already owns (payables come from the aging/
 * ledger services).
 */
import { db } from "@/lib/db";

const fmtDate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export async function getPurchaseRegister(businessId: string) {
  const pos = await db.purchaseOrder.findMany({
    where: { businessId },
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return pos.map((p) => ({
    code: p.code,
    date: fmtDate(p.createdAt),
    supplier: p.supplier?.name ?? "—",
    total: Math.round(p.totalAmount),
    status: p.status,
  }));
}

export async function getGoodsReceiptRegister(businessId: string) {
  const grs = await db.goodsReceiptRequest.findMany({
    where: { businessId },
    include: { purchaseOrder: { select: { code: true, supplier: { select: { name: true } } } } },
    orderBy: { receivedAt: "desc" },
  });
  return grs.map((g) => ({
    code: g.code,
    date: fmtDate(g.receivedAt),
    po: g.purchaseOrder?.code ?? "—",
    supplier: g.purchaseOrder?.supplier?.name ?? "—",
    status: g.status,
  }));
}

export async function getVendorBillRegister(businessId: string) {
  const bills = await db.supplierBill.findMany({
    where: { businessId, deletedAt: null },
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return bills.map((b) => ({
    code: b.code,
    date: fmtDate(b.createdAt),
    supplier: b.supplier?.name ?? "—",
    total: Math.round(b.totalAmount.toNumber()),
    paid: Math.round(b.paidAmount.toNumber()),
    remaining: Math.round(b.remainingAmount.toNumber()),
    status: b.status,
  }));
}

export async function getVendorPaymentRegister(businessId: string) {
  const payments = await db.supplierPayment.findMany({
    where: { businessId },
    include: { bill: { select: { code: true, supplier: { select: { name: true } } } } },
    orderBy: { paymentDate: "desc" },
  });
  return payments.map((p) => ({
    date: fmtDate(p.paymentDate),
    reference: p.reference ?? "—",
    bill: p.bill?.code ?? "—",
    supplier: p.bill?.supplier?.name ?? "—",
    method: p.method,
    amount: Math.round(p.amount.toNumber()),
  }));
}

export async function getSupplierSpend(businessId: string) {
  const [grouped, suppliers] = await Promise.all([
    db.supplierBill.groupBy({ by: ["supplierId"], where: { businessId, deletedAt: null }, _sum: { totalAmount: true, paidAmount: true }, _count: true }),
    db.supplier.findMany({ where: { businessId, deletedAt: null }, select: { id: true, name: true } }),
  ]);
  const nameById = new Map(suppliers.map((s) => [s.id, s.name]));
  return grouped
    .map((g) => {
      const billed = g._sum.totalAmount?.toNumber() ?? 0;
      const paid = g._sum.paidAmount?.toNumber() ?? 0;
      return {
        supplier: nameById.get(g.supplierId) ?? "—",
        bills: g._count,
        billed: Math.round(billed),
        paid: Math.round(paid),
        outstanding: Math.round(billed - paid),
      };
    })
    .sort((a, b) => b.billed - a.billed);
}
