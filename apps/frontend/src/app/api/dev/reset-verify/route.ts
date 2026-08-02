import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Dev-only: reset cross-run verification pollution. Interrupted/failed harness runs (e.g. a timed-out
 * loop, or posting throwing on a closed period) can leave (a) stale PENDING/FAILED outbox events that
 * get RE-APPLIED to the shared projection on the next drainOutbox, and (b) leaked throwaway entities.
 * This clears stale outbox events and deletes verify-coded entities so the regression sweep starts
 * from a clean, drained state. Idempotent. Disabled in production.
 */
export const dynamic = "force-dynamic";

const PREFIXES = {
  quotation: ["QT-VERIFY"],
  salesOrder: ["SO-VERIFY", "SO-INVVER"],
  shipment: ["SHP-VERIFY", "SHP-INVVER"],
  customer: ["VERIFY-", "INVVER-"],
  supplier: ["SUP-VERIFY", "SUP-IDEMP", "SUP-INVVER"],
  purchaseOrder: ["PO-VERIFY", "PO-IDEMP"],
  goodsReceipt: ["GR-VERIFY", "GR-IDEMP"],
  requisition: ["PR-VERIFY", "PR-INVVER"],
};

const orClauses = (codes: string[]) => codes.map((c) => ({ code: { startsWith: c } }));

export async function GET() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "nope" }, { status: 404 });
  const r: Record<string, number> = {};

  // 1. Stale outbox events (the re-application vector).
  r.outboxPendingFailed = (await db.outboxEventRecord.deleteMany({ where: { status: { in: ["PENDING", "FAILED"] } } })).count;

  // 2. Shipments (+ their stock movements, delivery notes) — before SOs (shipment_lines → so_lines).
  const shipments = await db.shipment.findMany({ where: { OR: orClauses(PREFIXES.shipment) }, select: { id: true } });
  const shipIds = shipments.map((s) => s.id);
  if (shipIds.length) {
    r.shipMovements = (await db.stockMovementRecord.deleteMany({ where: { correlationId: { in: shipIds.map((id) => `SHP-${id}`) } } })).count;
    await db.deliveryNote.deleteMany({ where: { shipmentId: { in: shipIds } } });
    r.shipments = (await db.shipment.deleteMany({ where: { id: { in: shipIds } } })).count;
  }

  // 3. Sales orders (+ reservations).
  const sos = await db.salesOrder.findMany({ where: { OR: orClauses(PREFIXES.salesOrder) }, select: { id: true } });
  const soIds = sos.map((s) => s.id);
  if (soIds.length) {
    await db.reservationRecord.deleteMany({ where: { referenceId: { in: soIds } } });
    r.salesOrders = (await db.salesOrder.deleteMany({ where: { id: { in: soIds } } })).count;
  }
  r.quotations = (await db.quotation.deleteMany({ where: { OR: orClauses(PREFIXES.quotation) } })).count;

  // 4. Procurement: goods receipts → supplier bills (+ journals/payables) → payments → POs.
  const grs = await db.goodsReceiptRequest.findMany({ where: { OR: orClauses(PREFIXES.goodsReceipt) }, select: { id: true } });
  const grIds = grs.map((g) => g.id);
  if (grIds.length) {
    await db.journalEntry.deleteMany({ where: { sourceId: { in: grIds } } });
    const bills = await db.supplierBill.findMany({ where: { sourceType: "GOODS_RECEIPT", sourceId: { in: grIds } }, select: { id: true } });
    const billIds = bills.map((b) => b.id);
    if (billIds.length) {
      await db.journalEntry.deleteMany({ where: { sourceId: { in: billIds } } });
      await db.payableEntry.deleteMany({ where: { sourceType: "SUPPLIER_BILL", sourceId: { in: billIds } } });
      await db.supplierPayment.deleteMany({ where: { billId: { in: billIds } } });
      await db.supplierBill.deleteMany({ where: { id: { in: billIds } } });
    }
    r.goodsReceipts = (await db.goodsReceiptRequest.deleteMany({ where: { id: { in: grIds } } })).count;
  }
  r.purchaseOrders = (await db.purchaseOrder.deleteMany({ where: { OR: orClauses(PREFIXES.purchaseOrder) } })).count;
  r.requisitions = (await db.purchaseRequisition.deleteMany({ where: { OR: orClauses(PREFIXES.requisition) } })).count;
  r.suppliers = (await db.supplier.deleteMany({ where: { OR: orClauses(PREFIXES.supplier) } })).count;
  r.customers = (await db.customer.deleteMany({ where: { OR: orClauses(PREFIXES.customer) } })).count;

  // 5. Verify audit rows.
  r.audit = (await db.auditLog.deleteMany({ where: { actorId: "VERIFY" } })).count;

  return NextResponse.json(r);
}
