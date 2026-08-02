/**
 * Duplicate-protection / idempotency verification for the procurement event chain.
 *
 * For each event it processes ONCE, snapshots the resulting state, then REPLAYS the identical event
 * (a fresh outbox record, same payload/sourceId) and asserts nothing changed: inventory updated
 * once, supplier bill once, AP once, journals once, GL balanced. This is the retry-safety release
 * gate — the level at which ERP event systems typically fail. Self-cleaning.
 */
import { db } from "@/lib/db";
import { drainOutbox } from "@/lib/outbox";

const QTY = 4;
const PRICE = 60;
const AMOUNT = QTY * PRICE;

export interface VerifyStep { step: string; ok: boolean; detail: string }
export interface VerifyReport { business: string; passed: number; failed: number; steps: VerifyStep[] }

let evtSeq = 0;
const nextEventId = (tag: string) => `EVT-IDEMP-${tag}-${Date.now()}-${evtSeq++}`;

export async function runIdempotencyVerification(opts?: { businessId?: string }): Promise<VerifyReport> {
  const steps: VerifyStep[] = [];
  const add = (step: string, ok: boolean, detail = "") => steps.push({ step, ok, detail });

  const created = { supplierId: "", poId: "", grId: "", billId: "", paymentId: "", eventIds: [] as string[] };
  let variantId = "";
  let warehouseId = "";
  let avgCostBefore = 0;
  let onHandBefore = 0;
  let availableBefore = 0;
  let resolvedBiz = "";
  let businessName = "";

  const emit = async (eventType: string, aggregateId: string, payload: unknown, businessId: string, tenantId: string) => {
    const eventId = nextEventId(eventType);
    created.eventIds.push(eventId);
    await db.outboxEventRecord.create({ data: { eventId, eventType, aggregateId, aggregateVersion: 1, businessId, tenantId, occurredAt: new Date(), payload: payload as object, status: "PENDING" } });
    await drainOutbox();
    // Track chained events for cleanup.
    (await db.outboxEventRecord.findMany({ where: { aggregateId } })).forEach((e) => { if (!created.eventIds.includes(e.eventId)) created.eventIds.push(e.eventId); });
  };

  try {
    let businessId = opts?.businessId;
    if (!businessId) {
      const anyVariant = await db.productVariant.findFirst({ where: { deletedAt: null } });
      businessId = anyVariant?.businessId ?? (await db.business.findFirst())?.id;
    }
    const business = businessId ? await db.business.findUnique({ where: { id: businessId } }) : null;
    if (!business) throw new Error("No business");
    businessId = business.id;
    resolvedBiz = business.id;
    businessName = business.name;
    const tenantId = business.tenantId;
    const currency = business.defaultCurrencyId ? { id: business.defaultCurrencyId } : await db.currency.findFirst();
    if (!currency) throw new Error("No currency");

    let warehouse = await db.warehouse.findFirst({ where: { businessId, isDefault: true } });
    if (!warehouse) warehouse = await db.warehouse.findFirst({ where: { businessId } });
    if (!warehouse) throw new Error("No warehouse");
    warehouseId = warehouse.id;
    const variant = await db.productVariant.findFirst({ where: { businessId, deletedAt: null } });
    if (!variant) throw new Error("No variant");
    variantId = variant.id;

    let invRecord = await db.inventoryRecord.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } } });
    if (!invRecord) invRecord = await db.inventoryRecord.create({ data: { id: `${businessId}-${variantId}-${warehouseId}`, businessId, tenantId, variantId, warehouseId, createdBy: "VERIFY", updatedBy: "VERIFY" } });
    let proj = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } } });
    if (!proj) proj = await db.inventoryVariantProjection.create({ data: { businessId, tenantId, variantId, warehouseId, onHandQuantity: 10, reservedQuantity: 0, availableQuantity: 10, averageCost: 50 } });
    avgCostBefore = proj.averageCost.toNumber();
    onHandBefore = proj.onHandQuantity;
    availableBefore = proj.availableQuantity;

    const supplier = await db.supplier.create({ data: { businessId, name: "Idempotency Supplier", code: `SUP-IDEMP-${Date.now()}` } });
    created.supplierId = supplier.id;
    const po = await db.purchaseOrder.create({ data: { businessId, code: `PO-IDEMP-${Date.now()}`, supplierId: supplier.id, currencyId: currency.id, status: "APPROVED", totalAmount: AMOUNT, lines: { create: [{ variantId, quantity: QTY, unitPrice: PRICE, totalPrice: AMOUNT, receivedQty: 0 }] } }, include: { lines: true } });
    created.poId = po.id;
    const poLine = po.lines[0];
    const gr = await db.goodsReceiptRequest.create({ data: { businessId, code: `GR-IDEMP-${Date.now()}`, poId: po.id, warehouseId, status: "REQUESTED", lines: { create: [{ poLineId: poLine.id, variantId, requestedQty: QTY }] } } });
    created.grId = gr.id;

    // Simulate the goods-receipt action's inline stock increase.
    await db.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } }, data: { onHandQuantity: proj.onHandQuantity + QTY, availableQuantity: proj.availableQuantity + QTY } });

    const grPayload = { poId: po.id, grId: gr.id, acceptedLines: [{ id: gr.id, acceptedQty: QTY, rejectedQty: 0, poLineId: poLine.id, variantId }] };

    // ---- GoodsReceiptCompleted: process once, snapshot, replay ----
    await emit("GoodsReceiptCompleted", gr.id, grPayload, businessId, tenantId);
    const billsAfter1 = await db.supplierBill.count({ where: { businessId, sourceType: "GOODS_RECEIPT", sourceId: gr.id } });
    const poLine1 = await db.purchaseOrderLine.findUnique({ where: { id: poLine.id } });
    const wac1 = (await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } } }))?.averageCost.toNumber() ?? 0;

    await emit("GoodsReceiptCompleted", gr.id, grPayload, businessId, tenantId); // REPLAY
    const billsAfter2 = await db.supplierBill.count({ where: { businessId, sourceType: "GOODS_RECEIPT", sourceId: gr.id } });
    const poLine2 = await db.purchaseOrderLine.findUnique({ where: { id: poLine.id } });
    const wac2 = (await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } } }))?.averageCost.toNumber() ?? 0;

    add("GR replay → one supplier bill", billsAfter1 === 1 && billsAfter2 === 1, `bills after 1st=${billsAfter1}, after replay=${billsAfter2}`);
    add("GR replay → PO receivedQty not doubled", poLine1?.receivedQty === QTY && poLine2?.receivedQty === QTY, `receivedQty after 1st=${poLine1?.receivedQty}, after replay=${poLine2?.receivedQty} (expected ${QTY})`);
    add("GR replay → WAC unchanged", Math.abs(wac1 - wac2) < 1e-6, `WAC after 1st=${wac1.toFixed(4)}, after replay=${wac2.toFixed(4)}`);

    const bill = await db.supplierBill.findFirst({ where: { businessId, sourceType: "GOODS_RECEIPT", sourceId: gr.id } });
    if (bill) {
      created.billId = bill.id;
      const billAmt = bill.totalAmount.toNumber();
      await db.supplierBill.update({ where: { id: bill.id }, data: { status: "APPROVED" } });

      // ---- SupplierBillApproved: process once, snapshot, replay ----
      await emit("SupplierBillApproved", bill.id, { billId: bill.id, amount: billAmt }, businessId, tenantId);
      const payable1 = await db.payableEntry.count({ where: { businessId, sourceType: "SUPPLIER_BILL", sourceId: bill.id } });
      const apJ1 = await db.journalEntry.count({ where: { businessId, sourceType: "SUPPLIER_BILL", sourceId: bill.id } });
      await emit("SupplierBillApproved", bill.id, { billId: bill.id, amount: billAmt }, businessId, tenantId); // REPLAY
      const payable2 = await db.payableEntry.count({ where: { businessId, sourceType: "SUPPLIER_BILL", sourceId: bill.id } });
      const apJ2 = await db.journalEntry.count({ where: { businessId, sourceType: "SUPPLIER_BILL", sourceId: bill.id } });
      add("Bill-approved replay → one payable", payable1 === 1 && payable2 === 1, `payable after 1st=${payable1}, after replay=${payable2}`);
      add("Bill-approved replay → one AP journal", apJ1 === 1 && apJ2 === 1, `AP journals after 1st=${apJ1}, after replay=${apJ2}`);

      // ---- SupplierPaymentRegistered: process once, snapshot, replay ----
      const payment = await db.supplierPayment.create({ data: { businessId, billId: bill.id, amount: AMOUNT, currencyId: currency.id } });
      created.paymentId = payment.id;
      await emit("SupplierPaymentRegistered", payment.id, { paymentId: payment.id, amount: AMOUNT }, businessId, tenantId);
      const payJ1 = await db.journalEntry.count({ where: { businessId, sourceType: "SUPPLIER_PAYMENT", sourceId: payment.id } });
      await emit("SupplierPaymentRegistered", payment.id, { paymentId: payment.id, amount: AMOUNT }, businessId, tenantId); // REPLAY
      const payJ2 = await db.journalEntry.count({ where: { businessId, sourceType: "SUPPLIER_PAYMENT", sourceId: payment.id } });
      add("Payment replay → one payment journal", payJ1 === 1 && payJ2 === 1, `payment journals after 1st=${payJ1}, after replay=${payJ2}`);
    }

    const agg = await db.journalLine.aggregate({ where: { businessId }, _sum: { debit: true, credit: true } });
    add("General Ledger balanced", Math.abs(Number(agg._sum.debit ?? 0) - Number(agg._sum.credit ?? 0)) < 0.01, `Σdebits=${Number(agg._sum.debit ?? 0).toFixed(2)} Σcredits=${Number(agg._sum.credit ?? 0).toFixed(2)}`);
  } catch (err) {
    add("Fatal error", false, err instanceof Error ? err.message : String(err));
  } finally {
    try {
      if (created.paymentId) { await db.journalEntry.deleteMany({ where: { sourceId: created.paymentId } }); await db.supplierPayment.deleteMany({ where: { id: created.paymentId } }); }
      if (created.billId) { await db.journalEntry.deleteMany({ where: { sourceId: created.billId } }); await db.payableEntry.deleteMany({ where: { sourceType: "SUPPLIER_BILL", sourceId: created.billId } }); }
      if (created.grId) { await db.journalEntry.deleteMany({ where: { sourceId: created.grId } }); await db.supplierBill.deleteMany({ where: { sourceType: "GOODS_RECEIPT", sourceId: created.grId } }); await db.goodsReceiptRequest.deleteMany({ where: { id: created.grId } }); }
      if (created.poId) await db.purchaseOrder.deleteMany({ where: { id: created.poId } });
      if (created.supplierId) await db.supplier.deleteMany({ where: { id: created.supplierId } });
      if (created.eventIds.length) await db.outboxEventRecord.deleteMany({ where: { eventId: { in: created.eventIds } } });
      if (variantId && warehouseId && resolvedBiz) {
        // Restore averageCost across the variant's warehouses AND undo the inline onHand/available
        // top-up on the receiving warehouse (previously only averageCost was restored, so each run
        // leaked +QTY onHand and slowly drifted stock).
        await db.inventoryVariantProjection.updateMany({ where: { businessId: resolvedBiz, variantId }, data: { averageCost: avgCostBefore } }).catch(() => {});
        await db.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId: resolvedBiz, variantId, warehouseId } }, data: { onHandQuantity: onHandBefore, availableQuantity: availableBefore } }).catch(() => {});
      }
    } catch {
      // best-effort
    }
  }

  const passed = steps.filter((s) => s.ok).length;
  return { business: businessName, passed, failed: steps.length - passed, steps };
}
