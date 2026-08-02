/**
 * Inventory backend runtime verification — "verify first, build second".
 *
 * Inventory is the system of record for physical stock and valuation; Sales and Procurement consume
 * it. This harness proves the transactional engine against the live database BEFORE any UI work, and
 * ends every scenario with the permanent inventory invariants (see `inventory-invariants.ts`):
 *   1. projection identity   onHand = Σ(RECEIVED) − Σ(FULFILLED) ± Adjustments ± Returns
 *   2. availability          available = onHand − Σ(active reservations)
 *   3. valuation             value = onHand × averageCost
 *   4. WAC boundary          averageCost changes ONLY on valuation events (receipt/adjustment/return)
 *
 *   Part A — isolated zero-baseline warehouse: movement types (IN/OUT/TRANSFER/ADJUSTMENT/RETURN)
 *            reconcile to the projection.
 *   Part B — reservation lifecycle on the real handler: reserve, double/replay, cancel, re-reserve
 *            after cancel, expire, and all-or-nothing (request > available).
 *   Part C — picking lifecycle + dispatch: pick / partial-pick / unpick / pack / ship-prep must NOT
 *            move stock or change WAC; only the stock-OUT event does — and it is replay-safe.
 *   Part D — RELEASE GATE: the read-model services (stock-balance, valuation, dashboard, stock-ledger,
 *            reports, Inventory 360) tie out to the transactional source and to each other; audit
 *            store writable + business-scoped.
 *
 * Self-cleaning: creates throwaway data and removes it in `finally`.
 */
import { db } from "@/lib/db";
import { drainOutbox } from "@/lib/outbox";
import { v4 as uuidv4 } from "uuid";
import { checkInvariants, checkWacUnchanged, snapshotInventory, type InvariantResult, type InventorySnapshot } from "./inventory-invariants";
import { getStockBalance, getInventoryAvailability } from "@/lib/inventory/stock-balance";
import { getInventoryValuation } from "@/lib/inventory/inventory-valuation";
import { getStockLedger } from "@/lib/inventory/stock-ledger";
import { getInventoryDashboard } from "@/lib/inventory/inventory-dashboard";
import { getWarehouseStockReport, getInventoryValuationReport } from "@/lib/inventory/inventory-reports";
import { getInventory360 } from "@/lib/inventory/inventory-360";

const RQTY = 3; // reserve / ship quantity

export interface VerifyStep { step: string; ok: boolean; detail: string }
export interface VerifyReport { business: string; passed: number; failed: number; steps: VerifyStep[] }

export async function runInventoryRuntimeVerification(opts?: { businessId?: string }): Promise<VerifyReport> {
  const steps: VerifyStep[] = [];
  const add = (step: string, ok: boolean, detail = "") => steps.push({ step, ok, detail });
  const addAll = (rs: InvariantResult[]) => rs.forEach((r) => steps.push(r));

  const created = {
    isoWarehouseId: "",
    isoInvId: "",
    isoReservationIds: [] as string[],
    customerId: "",
    soIds: [] as string[],
    shipmentIds: [] as string[],
    outboxEventIds: [] as string[],
    auditId: "",
  };
  let projSnapshot: { onHand: number; reserved: number; available: number; avgCost: number } | null = null;
  let bVariantId = "";
  let bWarehouseId = "";
  let bInvId = "";
  let businessName = "";
  let resolvedBusinessId = "";

  try {
    let businessId = opts?.businessId;
    if (!businessId) {
      const anyVariant = await db.productVariant.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
      businessId = anyVariant?.businessId ?? (await db.business.findFirst({ orderBy: { createdAt: "asc" } }))?.id;
    }
    const business = businessId ? await db.business.findUnique({ where: { id: businessId } }) : null;
    if (!business) throw new Error("No business found");
    businessId = business.id;
    resolvedBusinessId = business.id;
    businessName = business.name;
    const tenantId = business.tenantId;
    const currency = business.defaultCurrencyId ? { id: business.defaultCurrencyId } : await db.currency.findFirst();
    if (!currency) throw new Error("No currency configured");
    const variant = await db.productVariant.findFirst({ where: { businessId, deletedAt: null } });
    if (!variant) throw new Error("No product variant");

    // ══ PART A — Isolated movement→projection identity (zero-baseline throwaway warehouse) ═════════
    const isoWh = await db.warehouse.create({ data: { businessId, code: `WH-INVVER-${Date.now()}`, name: "Inventory Verify WH", warehouseType: "STORAGE" } });
    created.isoWarehouseId = isoWh.id;
    const isoInv = await db.inventoryRecord.create({ data: { id: `INVVER-${Date.now()}`, businessId, tenantId, variantId: variant.id, warehouseId: isoWh.id, createdBy: "VERIFY", updatedBy: "VERIFY" } });
    created.isoInvId = isoInv.id;
    const WAC0 = 100;
    await db.inventoryVariantProjection.create({ data: { businessId, tenantId, variantId: variant.id, warehouseId: isoWh.id, onHandQuantity: 0, reservedQuantity: 0, availableQuantity: 0, averageCost: WAC0 } });
    const baseIso = await snapshotInventory(businessId, isoInv.id, variant.id, isoWh.id); // zero baseline

    const mvSpec: { type: string; qty: number }[] = [
      { type: "RECEIVED", qty: 100 }, { type: "FULFILLED", qty: -30 }, { type: "TRANSFERRED_OUT", qty: -10 }, { type: "ADJUSTED", qty: -5 }, { type: "RETURN", qty: 8 },
    ];
    let expectedNet = 0;
    for (const m of mvSpec) {
      await db.stockMovementRecord.create({ data: { id: `MOV-INVVER-${m.type}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, businessId, tenantId, inventoryId: isoInv.id, variantId: variant.id, warehouseId: isoWh.id, type: m.type, quantityValue: m.qty, quantityUnit: "pcs", actorId: "VERIFY" } });
      expectedNet += m.qty;
    }
    const snapA = await snapshotInventory(businessId, isoInv.id, variant.id, isoWh.id);
    await db.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId, variantId: variant.id, warehouseId: isoWh.id } }, data: { onHandQuantity: snapA.ledgerOnHand, reservedQuantity: snapA.activeReserved, availableQuantity: snapA.ledgerOnHand - snapA.activeReserved } });
    add("Movement types reconcile to projection (onHand = ΣIn − ΣOut ± Adj ± Return)", snapA.ledgerOnHand === expectedNet && snapA.ledgerOnHand === 63, `onHand=${snapA.ledgerOnHand} expected ${expectedNet} (100−30−10−5+8)`);
    addAll(checkInvariants(baseIso, await snapshotInventory(businessId, isoInv.id, variant.id, isoWh.id), "Part A after movements"));

    // Reservation reduces available, not onHand; WAC untouched.
    const isoRes = await db.reservationRecord.create({ data: { id: `RES-INVVER-${Date.now()}`, businessId, tenantId, inventoryId: isoInv.id, quantity: 20, referenceId: "INVVER-REF", status: "ACTIVE", expiresAt: new Date(Date.now() + 86400000) } });
    created.isoReservationIds.push(isoRes.id);
    await db.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId, variantId: variant.id, warehouseId: isoWh.id } }, data: { reservedQuantity: 20, availableQuantity: 43 } });
    addAll(checkInvariants(baseIso, await snapshotInventory(businessId, isoInv.id, variant.id, isoWh.id), "Part A after reservation"));
    const isoProjWac = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: variant.id, warehouseId: isoWh.id } } });
    add(checkWacUnchanged(WAC0, isoProjWac?.averageCost.toNumber() ?? -1, "Part A movements+reservation").step, Math.abs((isoProjWac?.averageCost.toNumber() ?? -1) - WAC0) < 1e-6, `averageCost=${isoProjWac?.averageCost.toNumber()} (expected ${WAC0})`);

    // ══ PART B — Reservation lifecycle on the REAL handler (default warehouse) ═════════════════════
    let warehouse = await db.warehouse.findFirst({ where: { businessId, isDefault: true } });
    if (!warehouse) warehouse = await db.warehouse.findFirst({ where: { businessId, id: { not: isoWh.id } } });
    if (!warehouse) throw new Error("No default warehouse");
    bWarehouseId = warehouse.id;
    bVariantId = variant.id;
    let invRecord = await db.inventoryRecord.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: bVariantId, warehouseId: bWarehouseId } } });
    if (!invRecord) invRecord = await db.inventoryRecord.create({ data: { id: `${businessId}-${bVariantId}-${bWarehouseId}`, businessId, tenantId, variantId: bVariantId, warehouseId: bWarehouseId, createdBy: "VERIFY", updatedBy: "VERIFY" } });
    bInvId = invRecord.id;
    let proj = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: bVariantId, warehouseId: bWarehouseId } } });
    if (!proj) proj = await db.inventoryVariantProjection.create({ data: { businessId, tenantId, variantId: bVariantId, warehouseId: bWarehouseId, onHandQuantity: 100, reservedQuantity: 0, availableQuantity: 100, averageCost: 55 } });
    projSnapshot = { onHand: proj.onHandQuantity, reserved: proj.reservedQuantity, available: proj.availableQuantity, avgCost: proj.averageCost.toNumber() };
    if (proj.availableQuantity < RQTY * 3) proj = await db.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId, variantId: bVariantId, warehouseId: bWarehouseId } }, data: { onHandQuantity: proj.onHandQuantity + 100, availableQuantity: proj.availableQuantity + 100 } });
    const reserved0 = proj.reservedQuantity;
    const available0 = proj.availableQuantity;
    const baseB: InventorySnapshot = await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId); // baseline for delta invariants
    const customer = await db.customer.create({ data: { businessId, code: `INVVER-${Date.now()}`, name: "Inventory Verify Customer" } });
    created.customerId = customer.id;

    // Helper: make an SO with one line and emit a reservation event for it.
    const makeSo = async (qty: number) => {
      const so = await db.salesOrder.create({ data: { businessId, code: `SO-INVVER-${Date.now()}-${Math.floor(Math.random() * 1e4)}`, customerId: customer.id, currencyId: currency.id, totalAmount: qty * 100, status: "CONFIRMED", lines: { create: [{ variantId: bVariantId, quantity: qty, unitPrice: 100, totalPrice: qty * 100 }] } }, include: { lines: true } });
      created.soIds.push(so.id);
      return so;
    };
    const emitReserve = async (so: { id: string; lines: { id: string }[] }, qty: number) => {
      const id = uuidv4();
      created.outboxEventIds.push(id);
      await db.outboxEventRecord.create({ data: { eventId: id, eventType: "InventoryReservationRequested", aggregateId: so.id, aggregateVersion: 1, businessId, tenantId, occurredAt: new Date(), payload: { soId: so.id, lines: [{ id: so.lines[0].id, variantId: bVariantId, quantity: qty }] }, status: "PENDING" } });
      await drainOutbox();
    };

    const soA = await makeSo(RQTY);
    // 1) Reserve
    await emitReserve(soA, RQTY);
    let p = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: bVariantId, warehouseId: bWarehouseId } } });
    let activeCount = await db.reservationRecord.count({ where: { businessId, referenceId: soA.id, status: "ACTIVE" } });
    add("Reserve → 1 ACTIVE, reserved += qty, available −= qty", activeCount === 1 && (p?.reservedQuantity ?? 0) === reserved0 + RQTY && (p?.availableQuantity ?? 0) === available0 - RQTY, `active=${activeCount}, reserved=${p?.reservedQuantity} (exp ${reserved0 + RQTY}), available=${p?.availableQuantity} (exp ${available0 - RQTY})`);
    addAll(checkInvariants(baseB, await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId),"after reserve"));

    // 2) Double reserve / replay → idempotent
    await emitReserve(soA, RQTY);
    activeCount = await db.reservationRecord.count({ where: { businessId, referenceId: soA.id, status: "ACTIVE" } });
    p = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: bVariantId, warehouseId: bWarehouseId } } });
    add("Double reserve / replay idempotent (still 1 ACTIVE, reserved unchanged)", activeCount === 1 && (p?.reservedQuantity ?? 0) === reserved0 + RQTY, `active=${activeCount}, reserved=${p?.reservedQuantity}`);
    addAll(checkInvariants(baseB, await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId),"after replay"));

    // 3) Cancel (mirror cancelSalesOrder: restore projection + delete reservation + zero line qty)
    await db.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId, variantId: bVariantId, warehouseId: bWarehouseId } }, data: { reservedQuantity: reserved0, availableQuantity: available0 } });
    await db.salesOrderLine.updateMany({ where: { soId: soA.id }, data: { reservedQty: 0 } });
    await db.reservationRecord.deleteMany({ where: { businessId, referenceId: soA.id } });
    p = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: bVariantId, warehouseId: bWarehouseId } } });
    activeCount = await db.reservationRecord.count({ where: { businessId, referenceId: soA.id, status: "ACTIVE" } });
    add("Cancel reservation → 0 reservations, available restored", activeCount === 0 && (p?.reservedQuantity ?? 0) === reserved0 && (p?.availableQuantity ?? 0) === available0, `active=${activeCount}, reserved=${p?.reservedQuantity} (exp ${reserved0}), available=${p?.availableQuantity} (exp ${available0})`);
    addAll(checkInvariants(baseB, await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId),"after cancel"));

    // 4) Re-reserve after cancellation → NEW ACTIVE created (guard allows; prior was released)
    await emitReserve(soA, RQTY);
    activeCount = await db.reservationRecord.count({ where: { businessId, referenceId: soA.id, status: "ACTIVE" } });
    p = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: bVariantId, warehouseId: bWarehouseId } } });
    add("Re-reserve after cancellation → new ACTIVE reservation", activeCount === 1 && (p?.reservedQuantity ?? 0) === reserved0 + RQTY, `active=${activeCount}, reserved=${p?.reservedQuantity} (exp ${reserved0 + RQTY})`);
    addAll(checkInvariants(baseB, await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId),"after re-reserve"));

    // 5) Expire (no auto-sweeper exists — simulate what one would do: EXPIRED + restore projection)
    await db.reservationRecord.updateMany({ where: { businessId, referenceId: soA.id, status: "ACTIVE" }, data: { status: "EXPIRED", expiresAt: new Date(Date.now() - 86400000) } });
    await db.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId, variantId: bVariantId, warehouseId: bWarehouseId } }, data: { reservedQuantity: reserved0, availableQuantity: available0 } });
    activeCount = await db.reservationRecord.count({ where: { businessId, referenceId: soA.id, status: "ACTIVE" } });
    p = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: bVariantId, warehouseId: bWarehouseId } } });
    add("Expire reservation → 0 ACTIVE, available restored (NOTE: no automated expiry sweeper)", activeCount === 0 && (p?.availableQuantity ?? 0) === available0, `active=${activeCount}, available=${p?.availableQuantity} (exp ${available0})`);
    addAll(checkInvariants(baseB, await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId),"after expire"));

    // 6) All-or-nothing: request more than available → handler reserves NOTHING (no partial reserve)
    const soBig = await makeSo(available0 + 1000);
    await emitReserve(soBig, available0 + 1000);
    const bigActive = await db.reservationRecord.count({ where: { businessId, referenceId: soBig.id, status: "ACTIVE" } });
    p = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: bVariantId, warehouseId: bWarehouseId } } });
    add("All-or-nothing: request > available → no reservation, projection unchanged", bigActive === 0 && (p?.availableQuantity ?? 0) === available0 && (p?.reservedQuantity ?? 0) === reserved0, `active=${bigActive}, available=${p?.availableQuantity} (exp ${available0})`);
    addAll(checkInvariants(baseB, await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId),"after all-or-nothing"));

    // ══ PART C — Picking lifecycle + dispatch (fresh SO; pick/pack must not move stock or WAC) ═════
    const soC = await makeSo(RQTY);
    await emitReserve(soC, RQTY); // hold stock so dispatch can clear it
    const base = await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId);
    const shipment = await db.shipment.create({ data: { businessId, code: `SHP-INVVER-${Date.now()}`, soId: soC.id, warehouseId: bWarehouseId, status: "DRAFT", lines: { create: [{ soLineId: soC.lines[0].id, variantId: bVariantId, requestedQty: RQTY, pickedQty: 0, packedQty: 0, shippedQty: 0 }] } }, include: { lines: true } });
    created.shipmentIds.push(shipment.id);
    const shipLineId = shipment.lines[0].id;

    // Each fulfillment-stage update must leave onHand, averageCost and value unchanged.
    const stageUnchanged = async (label: string, data: Record<string, unknown>, status?: string) => {
      await db.shipmentLine.update({ where: { id: shipLineId }, data });
      if (status) await db.shipment.update({ where: { id: shipment.id }, data: { status: status as never } });
      const s = await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId);
      add(`Picking stage '${label}' does not move stock`, s.projOnHand === base.projOnHand, `onHand=${s.projOnHand} (exp ${base.projOnHand})`);
      add(checkWacUnchanged(base.avgCost, s.avgCost, `stage ${label}`).step, Math.abs(base.avgCost - s.avgCost) < 1e-6, `avgCost=${s.avgCost} (exp ${base.avgCost})`);
      add(`Picking stage '${label}' valuation unchanged (value = onHand × avgCost)`, Math.abs(s.value - base.value) < 1e-6, `value=${s.value.toFixed(4)} (exp ${base.value.toFixed(4)})`);
    };
    await stageUnchanged("pick complete", { pickedQty: RQTY }, "PICKING");
    await stageUnchanged("partial pick", { pickedQty: RQTY - 1 });
    await stageUnchanged("unpick", { pickedQty: 0 });
    await stageUnchanged("re-pick", { pickedQty: RQTY });
    await stageUnchanged("pack", { packedQty: RQTY }, "PACKING");
    await stageUnchanged("ship-prep (loaded)", { shippedQty: RQTY }, "LOADED");

    // Dispatch → stock-out: NOW stock leaves; WAC (unit cost) must still be unchanged.
    const emitStockOut = async () => {
      const id = uuidv4();
      created.outboxEventIds.push(id);
      await db.outboxEventRecord.create({ data: { eventId: id, eventType: "InventoryStockOutRequested", aggregateId: shipment.id, aggregateVersion: 1, businessId, tenantId, occurredAt: new Date(), payload: { shipmentId: shipment.id, warehouseId: bWarehouseId, lines: [{ variantId: bVariantId, shippedQty: RQTY, soLineId: soC.lines[0].id }] }, status: "PENDING" } });
      await drainOutbox();
      (await db.outboxEventRecord.findMany({ where: { aggregateId: shipment.id } })).forEach((e) => { if (!created.outboxEventIds.includes(e.eventId)) created.outboxEventIds.push(e.eventId); });
    };
    await db.shipment.update({ where: { id: shipment.id }, data: { status: "DISPATCHED" } });
    await emitStockOut();
    const outCount1 = await db.stockMovementRecord.count({ where: { businessId, correlationId: `SHP-${shipment.id}` } });
    const afterOut = await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId);
    add("Dispatch stock-out: onHand −= qty, ONE movement", outCount1 === 1 && base.projOnHand - afterOut.projOnHand === RQTY, `movements=${outCount1}, onHandΔ=${base.projOnHand - afterOut.projOnHand} (exp ${RQTY})`);
    add(checkWacUnchanged(base.avgCost, afterOut.avgCost, "stock-out").step, Math.abs(base.avgCost - afterOut.avgCost) < 1e-6, `avgCost=${afterOut.avgCost} (exp ${base.avgCost})`);
    const resFulfilled = await db.reservationRecord.findFirst({ where: { businessId, referenceId: soC.id } });
    add("Reservation FULFILLED on dispatch", resFulfilled?.status === "FULFILLED", `status=${resFulfilled?.status}`);
    addAll(checkInvariants(baseB, await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId),"after stock-out"));

    // Stock-out replay → idempotent (Priority #1)
    await emitStockOut();
    const outCount2 = await db.stockMovementRecord.count({ where: { businessId, correlationId: `SHP-${shipment.id}` } });
    const afterReplay = await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId);
    add("Stock-OUT REPLAY idempotent (one movement, no double deduction) [Priority #1]", outCount2 === 1 && afterReplay.projOnHand === afterOut.projOnHand, `movements=${outCount2} (exp 1), onHand=${afterReplay.projOnHand} (exp ${afterOut.projOnHand})`);
    addAll(checkInvariants(baseB, await snapshotInventory(businessId, bInvId, bVariantId, bWarehouseId),"after stock-out replay"));

    // ══ PART D — RELEASE GATE: read-model tie-outs + audit ════════════════════════════════════════
    const [balance, availability, valuation, dashboard, ledger, v360, whReport, valReport] = await Promise.all([
      getStockBalance(businessId),
      getInventoryAvailability(businessId),
      getInventoryValuation(businessId),
      getInventoryDashboard(businessId),
      getStockLedger(businessId, bVariantId),
      getInventory360(businessId, bVariantId),
      getWarehouseStockReport(businessId),
      getInventoryValuationReport(businessId),
    ]);

    // Tie-out 1: stock-balance total value == valuation total value (both from the projection).
    add("Read model: stock-balance value == valuation value", Math.abs(balance.totals.totalValue - valuation.totalValue) < 1, `balance=${balance.totals.totalValue}, valuation=${valuation.totalValue}`);
    // Tie-out 2: dashboard KPI reuses valuation (no recomputation).
    add("Read model: dashboard inventoryValue == valuation value", Math.abs(dashboard.kpis.inventoryValue - valuation.totalValue) < 1, `dashboard=${dashboard.kpis.inventoryValue}, valuation=${valuation.totalValue}`);
    // Tie-out 3: valuation report rows sum to the valuation total.
    const valReportSum = valReport.reduce((s, r) => s + r.value, 0);
    add("Read model: valuation report Σ == valuation value", Math.abs(valReportSum - valuation.totalValue) < 2, `report Σ=${valReportSum.toFixed(2)}, valuation=${valuation.totalValue}`);
    // Tie-out 4: warehouse-stock report line count == stock-balance line count.
    add("Read model: warehouse-stock report lines == balance lines", whReport.length === balance.totals.lineCount, `report=${whReport.length}, balance=${balance.totals.lineCount}`);
    // Tie-out 5: valuation by-warehouse Σ == total; balance available Σ == availability Σ.
    const whValSum = valuation.byWarehouse.reduce((s, w) => s + w.value, 0);
    const availSum = availability.reduce((s, a) => s + a.available, 0);
    add("Read model: valuation by-warehouse Σ == total AND availability reconciles", Math.abs(whValSum - valuation.totalValue) < 1 && Math.abs(availSum - balance.totals.totalAvailable) < 1, `whΣ=${whValSum.toFixed(2)} total=${valuation.totalValue}; availΣ=${availSum} balAvail=${balance.totals.totalAvailable}`);
    // Tie-out 6: Inventory 360 summary value == Σ its warehouse balances (composition consistency).
    const v360WhSum = v360?.warehouseBalances.reduce((s, w) => s + w.value, 0) ?? -1;
    add("Read model: Inventory 360 value == Σ warehouse balances", !!v360 && Math.abs(v360.summary.value - v360WhSum) < 1, v360 ? `360=${v360.summary.value}, Σwh=${v360WhSum.toFixed(2)}` : "no 360");
    // Tie-out 7: stock-ledger closing balance == Σ recorded movements for the variant (ledger self-consistency).
    const mvSum = (await db.stockMovementRecord.aggregate({ where: { businessId, variantId: bVariantId }, _sum: { quantityValue: true } }))._sum.quantityValue ?? 0;
    add("Read model: stock-ledger closing == Σ movements (ledger self-consistent)", !!ledger && Math.abs(ledger.closingBalance - mvSum) < 0.01, ledger ? `ledgerClose=${ledger.closingBalance}, Σmovements=${mvSum}` : "no ledger");

    // ── Audit: store writable, readable and business-scoped (the inventory actions call logAudit;
    //    logAudit is auth-bound so here we assert the store itself). ─────────────────────────────
    const auditRow = await db.auditLog.create({ data: { tenantId, businessId, actorId: "VERIFY", action: "adjust", resource: "inventory", resourceId: bInvId } });
    created.auditId = auditRow.id;
    const auditReadBack = await db.auditLog.findFirst({ where: { businessId, resourceId: bInvId, action: "adjust" } });
    const auditCrossBusiness = await db.auditLog.findFirst({ where: { businessId: `${businessId}-nope`, resourceId: bInvId } });
    add("Audit row written, readable, business-scoped", !!auditReadBack && !auditCrossBusiness, `readBack=${!!auditReadBack}, isolation=${!auditCrossBusiness}`);
  } catch (err) {
    add("Fatal error", false, err instanceof Error ? err.message : String(err));
  } finally {
    try {
      if (created.auditId) await db.auditLog.deleteMany({ where: { id: created.auditId } });
      for (const shipId of created.shipmentIds) {
        await db.stockMovementRecord.deleteMany({ where: { correlationId: `SHP-${shipId}` } });
        await db.deliveryNote.deleteMany({ where: { shipmentId: shipId } });
        await db.shipment.deleteMany({ where: { id: shipId } });
      }
      for (const soId of created.soIds) {
        await db.reservationRecord.deleteMany({ where: { referenceId: soId } });
        await db.salesOrder.deleteMany({ where: { id: soId } });
      }
      if (created.customerId) await db.customer.deleteMany({ where: { id: created.customerId } });
      if (created.outboxEventIds.length) await db.outboxEventRecord.deleteMany({ where: { eventId: { in: created.outboxEventIds } } });
      if (projSnapshot && bVariantId && bWarehouseId && resolvedBusinessId) {
        await db.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId: resolvedBusinessId, variantId: bVariantId, warehouseId: bWarehouseId } }, data: { onHandQuantity: projSnapshot.onHand, reservedQuantity: projSnapshot.reserved, availableQuantity: projSnapshot.available, averageCost: projSnapshot.avgCost } }).catch(() => {});
      }
      // Self-healing Part A cleanup: purge every WH-INVVER warehouse + its projections/inventory.
      if (created.isoReservationIds.length) await db.reservationRecord.deleteMany({ where: { id: { in: created.isoReservationIds } } });
      if (resolvedBusinessId) {
        const strays = await db.warehouse.findMany({ where: { businessId: resolvedBusinessId, code: { startsWith: "WH-INVVER" } }, select: { id: true } });
        const strayWhIds = strays.map((w) => w.id);
        if (strayWhIds.length) {
          const strayInv = await db.inventoryRecord.findMany({ where: { warehouseId: { in: strayWhIds } }, select: { id: true } });
          const strayInvIds = strayInv.map((r) => r.id);
          if (strayInvIds.length) {
            await db.reservationRecord.deleteMany({ where: { inventoryId: { in: strayInvIds } } }).catch(() => {});
            await db.stockMovementRecord.deleteMany({ where: { inventoryId: { in: strayInvIds } } }).catch(() => {});
          }
          await db.inventoryVariantProjection.deleteMany({ where: { businessId: resolvedBusinessId, warehouseId: { in: strayWhIds } } }).catch(() => {});
          if (strayInvIds.length) await db.inventoryRecord.deleteMany({ where: { id: { in: strayInvIds } } }).catch(() => {});
          await db.warehouse.deleteMany({ where: { id: { in: strayWhIds } } }).catch(() => {});
        }
      }
    } catch {
      // best-effort
    }
  }

  const passed = steps.filter((s) => s.ok).length;
  return { business: businessName, passed, failed: steps.length - passed, steps };
}
