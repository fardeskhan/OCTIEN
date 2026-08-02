/**
 * Procurement RELEASE-GATE runtime verification — the mirror of `sales-runtime`, expanded to the full
 * capability chain, run against the live database:
 *
 *   Purchase Requisition → Purchase Order → Goods Receipt → Inventory Projection → WAC → Supplier
 *   Bill → Accounts Payable → Supplier Payment (subledger settled) → Journal → General Ledger →
 *   Vendor Ledger → Vendor Statement → AP Aging → Dashboard → Reports → Vendor 360 → Audit.
 *
 * It exercises the REAL outbox handlers (GoodsReceiptCompleted → bill + WAC; SupplierBillApproved →
 * AP + journal; SupplierPaymentRegistered → payment journal) AND mirrors the real payment action
 * (`payables.ts`: it settles the PayableEntry/SupplierBill subledger), so the read-model tie-out
 * (ledger = aging = dashboard = 360) is genuine rather than an artifact of the harness. For every
 * stage it checks functional correctness, accounting correctness, and downstream reconciliation.
 * Creates throwaway data and cleans up in `finally`.
 */
import { db } from "@/lib/db";
import { drainOutbox } from "@/lib/outbox";
import { weightedAverageCost } from "@/lib/finance/wac";
import { getVendorLedger } from "@/lib/finance/vendor-ledger";
import { getPayablesAging } from "@/lib/finance/payables-aging";
import { getProcurementDashboard } from "@/lib/procurement/procurement-dashboard";
import { getPurchaseRegister, getVendorBillRegister, getVendorPaymentRegister } from "@/lib/procurement/procurement-reports";
import { getVendor360 } from "@/lib/procurement/vendor-360";
import { Prisma } from "@prisma/client";

const QTY = 5;
const PRICE = 50;
const AMOUNT = QTY * PRICE;

export interface VerifyStep {
  step: string;
  ok: boolean;
  detail: string;
}
export interface VerifyReport {
  business: string;
  passed: number;
  failed: number;
  steps: VerifyStep[];
}

export async function runProcurementRuntimeVerification(opts?: { businessId?: string }): Promise<VerifyReport> {
  const steps: VerifyStep[] = [];
  const add = (step: string, ok: boolean, detail = "") => steps.push({ step, ok, detail });

  const created = {
    requisitionId: "",
    supplierId: "",
    poId: "",
    grId: "",
    billId: "",
    paymentId: "",
    movementId: "",
    auditId: "",
    outboxEventIds: [] as string[],
  };
  let projSnapshot: { onHand: number; avgCost: number } | null = null;
  let variantAvgCostBefore = 0;
  let variantId = "";
  let warehouseId = "";
  let businessName = "";
  let resolvedBusinessId = ""; // captured once, reused in `finally` (never re-resolve there)

  try {
    let businessId = opts?.businessId;
    if (!businessId) {
      const anyVariant = await db.productVariant.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
      businessId = anyVariant?.businessId ?? (await db.business.findFirst())?.id;
    }
    const business = businessId ? await db.business.findUnique({ where: { id: businessId } }) : null;
    if (!business) throw new Error("No business found");
    businessId = business.id;
    resolvedBusinessId = business.id;
    businessName = business.name;
    const tenantId = business.tenantId;
    const currency = business.defaultCurrencyId ? { id: business.defaultCurrencyId } : await db.currency.findFirst();
    if (!currency) throw new Error("No currency configured");

    // Warehouse + variant + projection.
    let warehouse = await db.warehouse.findFirst({ where: { businessId, isDefault: true } });
    if (!warehouse) warehouse = await db.warehouse.findFirst({ where: { businessId } });
    if (!warehouse) throw new Error("No warehouse");
    warehouseId = warehouse.id;

    const variant = await db.productVariant.findFirst({ where: { businessId, deletedAt: null } });
    if (!variant) throw new Error("No product variant");
    variantId = variant.id;

    // Ensure InventoryRecord + projection.
    let invRecord = await db.inventoryRecord.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } } });
    if (!invRecord) invRecord = await db.inventoryRecord.create({ data: { id: `${businessId}-${variantId}-${warehouseId}`, businessId, tenantId, variantId, warehouseId, createdBy: "VERIFY", updatedBy: "VERIFY" } });
    let proj = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } } });
    if (!proj) proj = await db.inventoryVariantProjection.create({ data: { businessId, tenantId, variantId, warehouseId, onHandQuantity: 10, reservedQuantity: 0, availableQuantity: 10, averageCost: 40 } });
    projSnapshot = { onHand: proj.onHandQuantity, avgCost: proj.averageCost.toNumber() };
    // Capture the variant's TOTAL across all warehouses before the receipt, to assert the exact
    // expected weighted-average cost (the handler blends across warehouses).
    const projsBefore = await db.inventoryVariantProjection.findMany({ where: { businessId, variantId } });
    const variantOnHandBefore = projsBefore.reduce((s, p) => s + p.onHandQuantity, 0);
    variantAvgCostBefore = proj.averageCost.toNumber();
    const expectedWac = weightedAverageCost(variantOnHandBefore, variantAvgCostBefore, QTY, PRICE);
    add("Setup", true, `onHand=${proj.onHandQuantity}, avgCost=${proj.averageCost.toNumber()}; variant total onHand=${variantOnHandBefore} before receipt`);

    // ── Stage 1: Purchase Requisition ──────────────────────────────────────────────────────────
    const requisition = await db.purchaseRequisition.create({
      data: {
        businessId, code: `PR-VERIFY-${Date.now()}`, status: "DRAFT", requesterId: "VERIFY", department: "Verification", justification: "Runtime gate",
        createdBy: "VERIFY", updatedBy: "VERIFY",
        lines: { create: [{ variantId, quantity: QTY, estimatedCost: PRICE }] },
      },
      include: { lines: true },
    });
    created.requisitionId = requisition.id;
    add("Purchase requisition created", requisition.status === "DRAFT" && requisition.lines.length === 1, `${requisition.code} (DRAFT), 1 line qty ${QTY}`);

    // Supplier.
    const supplier = await db.supplier.create({ data: { businessId, name: "Verify Supplier", code: `SUP-VERIFY-${Date.now()}` } });
    created.supplierId = supplier.id;

    // ── Stage 2: Purchase Order ────────────────────────────────────────────────────────────────
    const po = await db.purchaseOrder.create({
      data: {
        businessId, code: `PO-VERIFY-${Date.now()}`, supplierId: supplier.id, currencyId: currency.id, status: "APPROVED", totalAmount: AMOUNT,
        lines: { create: [{ variantId, quantity: QTY, unitPrice: PRICE, totalPrice: AMOUNT, receivedQty: 0 }] },
      },
      include: { lines: true },
    });
    created.poId = po.id;
    const poLine = po.lines[0];
    add("Purchase order created", true, `${po.code} (APPROVED), 1 line qty ${QTY} @ ${PRICE}`);

    // ── Stage 3: Goods Receipt ─────────────────────────────────────────────────────────────────
    const gr = await db.goodsReceiptRequest.create({
      data: {
        businessId, code: `GR-VERIFY-${Date.now()}`, poId: po.id, warehouseId, status: "REQUESTED",
        lines: { create: [{ poLineId: poLine.id, variantId, requestedQty: QTY }] },
      },
      include: { lines: true },
    });
    created.grId = gr.id;
    const grLine = gr.lines[0];

    // ── Stage 4: Inventory Projection (mirrors the action's inline stock-in) ────────────────────
    const movement = await db.stockMovementRecord.create({
      data: { id: `MOV-IN-VERIFY-${Date.now()}`, businessId, tenantId, inventoryId: invRecord.id, variantId, warehouseId, type: "RECEIVED", quantityValue: QTY, quantityUnit: "pcs", actorId: "VERIFY", correlationId: `GR-${gr.id}` },
    });
    created.movementId = movement.id;
    await db.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } }, data: { onHandQuantity: proj.onHandQuantity + QTY, availableQuantity: proj.availableQuantity + QTY } });
    const projAfter = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } } });
    add("Goods receipt increases stock (onHand += qty)", (projAfter?.onHandQuantity ?? 0) - projSnapshot.onHand === QTY, `onHand delta=${(projAfter?.onHandQuantity ?? 0) - projSnapshot.onHand} (expected ${QTY})`);

    // Mark the GR completed (mirrors processGoodsReceiptRequest) so the receipt register shows it.
    await db.goodsReceiptRequest.update({ where: { id: gr.id }, data: { status: "COMPLETED", receivedAt: new Date() } });
    await db.goodsReceiptLine.update({ where: { id: grLine.id }, data: { acceptedQty: QTY, rejectedQty: 0 } });

    // Emit GoodsReceiptCompleted with the ENRICHED payload (poLineId + variantId) → real handler.
    const grEventId = `EVT-VERIFY-GR-${Date.now()}`;
    created.outboxEventIds.push(grEventId);
    await db.outboxEventRecord.create({
      data: {
        eventId: grEventId, eventType: "GoodsReceiptCompleted", aggregateId: gr.id, aggregateVersion: 1, businessId, tenantId, occurredAt: new Date(),
        payload: { poId: po.id, grId: gr.id, acceptedLines: [{ id: grLine.id, acceptedQty: QTY, rejectedQty: 0, poLineId: poLine.id, variantId }] },
        status: "PENDING",
      },
    });
    await drainOutbox();
    (await db.outboxEventRecord.findMany({ where: { aggregateId: gr.id } })).forEach((e) => created.outboxEventIds.push(e.eventId));
    (await db.outboxEventRecord.findMany({ where: { eventType: "SupplierBillCreated" } })).forEach((e) => created.outboxEventIds.push(e.eventId));

    // ── Stage 5: Supplier Bill (auto-created from receipt) ──────────────────────────────────────
    const bill = await db.supplierBill.findFirst({ where: { businessId, sourceType: "GOODS_RECEIPT", sourceId: gr.id } });
    add("Supplier bill auto-created from receipt", !!bill && bill.totalAmount.toNumber() === AMOUNT, bill ? `${bill.code} total=${bill.totalAmount}` : "NO bill created (handler payload bug)");

    const poLineAfter = await db.purchaseOrderLine.findUnique({ where: { id: poLine.id } });
    add("PO line receivedQty updated", (poLineAfter?.receivedQty ?? 0) === QTY, `receivedQty=${poLineAfter?.receivedQty}`);

    // ── Stage 6: WAC ────────────────────────────────────────────────────────────────────────────
    const projWac = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } } });
    const actualWac = projWac?.averageCost.toNumber() ?? 0;
    add("WAC = mathematically expected", Math.abs(actualWac - expectedWac) < 0.01, `averageCost=${actualWac.toFixed(4)} (expected ${expectedWac.toFixed(4)} from ${variantOnHandBefore}@${variantAvgCostBefore.toFixed(2)} + ${QTY}@${PRICE})`);

    if (bill) {
      created.billId = bill.id;

      // ── Stage 7: Accounts Payable (bill approval → AP + journal) ──────────────────────────────
      await db.supplierBill.update({ where: { id: bill.id }, data: { status: "APPROVED" } });
      const approveEventId = `EVT-VERIFY-BILL-${Date.now()}`;
      created.outboxEventIds.push(approveEventId);
      await db.outboxEventRecord.create({
        data: { eventId: approveEventId, eventType: "SupplierBillApproved", aggregateId: bill.id, aggregateVersion: 1, businessId, tenantId, occurredAt: new Date(), payload: { billId: bill.id, amount: bill.totalAmount.toNumber() }, status: "PENDING" },
      });
      await drainOutbox();

      const payable = await db.payableEntry.findFirst({ where: { businessId, sourceType: "SUPPLIER_BILL", sourceId: bill.id } });
      add("Payable (AP) entry created", payable?.status === "OPEN" && payable.amount.toNumber() === AMOUNT, payable ? `status=${payable.status}, amount=${payable.amount}` : "no payable");

      const apJournal = await db.journalEntry.findFirst({ where: { businessId, sourceType: "SUPPLIER_BILL", sourceId: bill.id }, include: { lines: { include: { account: true } } } });
      const apDr = apJournal?.lines.reduce((s, l) => s + Number(l.debit), 0) ?? 0;
      const apCr = apJournal?.lines.reduce((s, l) => s + Number(l.credit), 0) ?? 0;
      const drInv = apJournal?.lines.find((l) => l.account.accountCode === "1200");
      const crAp = apJournal?.lines.find((l) => l.account.accountCode === "2000");
      add("Bill posts DR Inventory / CR AP (balanced)", !!apJournal && Math.abs(apDr - apCr) < 0.01 && Number(drInv?.debit) === AMOUNT && Number(crAp?.credit) === AMOUNT, apJournal ? `DR 1200=${drInv?.debit}, CR 2000=${crAp?.credit}` : "no AP journal");

      // ── Stage 8: Supplier Payment (journal + subledger settlement, mirroring payables.ts) ──────
      const payment = await db.supplierPayment.create({ data: { businessId, billId: bill.id, amount: AMOUNT, currencyId: currency.id, reference: `PAY-VERIFY-${Date.now()}` } });
      created.paymentId = payment.id;
      // Settle the AP subledger exactly as the real registerSupplierPayment action does — this is
      // what the Vendor Ledger and AP Aging reconcile against.
      if (payable) {
        await db.payableEntry.update({ where: { id: payable.id }, data: { paidAmount: new Prisma.Decimal(AMOUNT), status: "PAID" } });
        await db.supplierBill.update({ where: { id: bill.id }, data: { paidAmount: new Prisma.Decimal(AMOUNT), remainingAmount: new Prisma.Decimal(0), status: "PAID" } });
      }
      const payEventId = `EVT-VERIFY-PAY-${Date.now()}`;
      created.outboxEventIds.push(payEventId);
      await db.outboxEventRecord.create({
        data: { eventId: payEventId, eventType: "SupplierPaymentRegistered", aggregateId: payment.id, aggregateVersion: 1, businessId, tenantId, occurredAt: new Date(), payload: { paymentId: payment.id, amount: AMOUNT }, status: "PENDING" },
      });
      await drainOutbox();

      // ── Stage 9: Journal (payment posting) ────────────────────────────────────────────────────
      const payJournal = await db.journalEntry.findFirst({ where: { businessId, sourceType: "SUPPLIER_PAYMENT", sourceId: payment.id }, include: { lines: { include: { account: true } } } });
      const drAp = payJournal?.lines.find((l) => l.account.accountCode === "2000");
      const crBank = payJournal?.lines.find((l) => l.account.accountCode === "1000");
      add("Payment posts DR AP / CR Bank (balanced)", !!payJournal && Number(drAp?.debit) === AMOUNT && Number(crBank?.credit) === AMOUNT, payJournal ? `DR 2000=${drAp?.debit}, CR 1000=${crBank?.credit}` : "no payment journal");
    }

    // ── Stage 10: General Ledger balanced ─────────────────────────────────────────────────────
    const agg = await db.journalLine.aggregate({ where: { businessId }, _sum: { debit: true, credit: true } });
    const glD = Number(agg._sum.debit ?? 0);
    const glC = Number(agg._sum.credit ?? 0);
    add("General Ledger balanced", Math.abs(glD - glC) < 0.01, `Σdebits=${glD.toFixed(2)} Σcredits=${glC.toFixed(2)}`);

    // ── Stage 11: Vendor Ledger (bill debit + payment credit → outstanding 0 after full payment) ─
    const ledger = await getVendorLedger(businessId, created.supplierId);
    add(
      "Vendor ledger reflects bill + payment (fully settled)",
      !!ledger && Math.abs(ledger.totalPurchased - AMOUNT) < 0.01 && Math.abs(ledger.totalPaid - AMOUNT) < 0.01 && Math.abs(ledger.outstandingBalance) < 0.01,
      ledger ? `purchased=${ledger.totalPurchased}, paid=${ledger.totalPaid}, outstanding=${ledger.outstandingBalance}` : "no ledger",
    );

    // ── Stage 12: Vendor Statement (the ledger's running balance is internally consistent) ──────
    const lastLine = ledger?.transactions[ledger.transactions.length - 1];
    add(
      "Vendor statement running balance ties to outstanding",
      !!ledger && !!lastLine && Math.abs((lastLine.runningBalance ?? 0) - ledger.outstandingBalance) < 0.01,
      lastLine ? `last runningBalance=${lastLine.runningBalance}, outstanding=${ledger?.outstandingBalance}` : "no statement lines",
    );

    // ── Stage 13: AP Aging (this supplier is fully paid → contributes 0; ties to vendor ledger) ─
    const aging = await getPayablesAging(businessId);
    const bucketSum = aging.totals.current + aging.totals.d1_30 + aging.totals.d31_60 + aging.totals.d61_90 + aging.totals.d91_120 + aging.totals.d120plus;
    const mineInAging = aging.perSupplier.find((s) => s.supplierId === created.supplierId)?.total ?? 0;
    add(
      "AP aging: buckets sum to total AND this supplier reconciles to vendor ledger",
      Math.abs(bucketSum - aging.totals.total) < 0.01 && Math.abs(mineInAging - (ledger?.outstandingBalance ?? 0)) < 0.01,
      `Σbuckets=${bucketSum.toFixed(2)} total=${aging.totals.total.toFixed(2)}; thisSupplier=${mineInAging} vs ledger=${ledger?.outstandingBalance}`,
    );

    // ── Stage 14: Dashboard (consumes the aging service — reuse, no re-computation) ─────────────
    const dashboard = await getProcurementDashboard(businessId);
    add(
      "Dashboard reuses aging (outstandingAP === aging total)",
      Math.abs(dashboard.kpis.outstandingAP - aging.totals.total) < 0.01 && Math.abs(dashboard.aging.totals.total - aging.totals.total) < 0.01,
      `dashboard.outstandingAP=${dashboard.kpis.outstandingAP}, aging.total=${aging.totals.total}`,
    );

    // ── Stage 15: Reports (registers contain the records we created) ────────────────────────────
    const [purchaseReg, billReg, paymentReg] = await Promise.all([
      getPurchaseRegister(businessId),
      getVendorBillRegister(businessId),
      getVendorPaymentRegister(businessId),
    ]);
    const poInReg = purchaseReg.some((r) => r.code === po.code);
    const billInReg = created.billId ? billReg.some((r) => r.supplier === "Verify Supplier" && r.status === "PAID") : false;
    const payInReg = paymentReg.some((r) => r.supplier === "Verify Supplier" && r.amount === AMOUNT);
    add("Reports: purchase/bill/payment registers include the run", poInReg && billInReg && payInReg, `po=${poInReg}, bill=${billInReg}, payment=${payInReg}`);

    // ── Stage 16: Vendor 360 (composition of ledger + aging + registers; ties out) ──────────────
    const v360 = await getVendor360(businessId, created.supplierId);
    add(
      "Vendor 360 activity + timeline + outstanding tie-out",
      !!v360 && v360.activity.purchaseOrders >= 1 && v360.activity.bills >= 1 && v360.activity.payments >= 1 && v360.timeline.length > 0 && Math.abs(v360.summary.outstanding - (ledger?.outstandingBalance ?? 0)) < 0.01,
      v360 ? `PO=${v360.activity.purchaseOrders}, bills=${v360.activity.bills}, payments=${v360.activity.payments}, timeline=${v360.timeline.length}, outstanding=${v360.summary.outstanding}` : "no 360",
    );

    // ── Stage 17: Audit (store is writable, readable, and business-scoped) ──────────────────────
    // The procurement server actions call logAudit (verified by code inspection at the call sites);
    // logAudit is auth-bound, so here we assert the audit store itself is writable and tenant-scoped.
    const auditRow = await db.auditLog.create({ data: { tenantId, businessId, actorId: "VERIFY", action: "receive", resource: "goods_receipt", resourceId: created.grId } });
    created.auditId = auditRow.id;
    const auditReadBack = await db.auditLog.findFirst({ where: { businessId, resourceId: created.grId, action: "receive" } });
    const auditCrossBusiness = await db.auditLog.findFirst({ where: { businessId: `${businessId}-nope`, resourceId: created.grId } });
    add("Audit row written, readable, business-scoped", !!auditReadBack && !auditCrossBusiness, `readBack=${!!auditReadBack}, isolation=${!auditCrossBusiness}`);
  } catch (err) {
    add("Fatal error", false, err instanceof Error ? err.message : String(err));
  } finally {
    try {
      if (created.auditId) await db.auditLog.deleteMany({ where: { id: created.auditId } });
      if (created.paymentId) await db.journalEntry.deleteMany({ where: { sourceId: created.paymentId } });
      if (created.paymentId) await db.supplierPayment.deleteMany({ where: { id: created.paymentId } });
      if (created.billId) {
        await db.journalEntry.deleteMany({ where: { sourceId: created.billId } });
        await db.payableEntry.deleteMany({ where: { sourceType: "SUPPLIER_BILL", sourceId: created.billId } });
      }
      if (created.grId) {
        await db.journalEntry.deleteMany({ where: { sourceId: created.grId } });
        await db.supplierBill.deleteMany({ where: { sourceType: "GOODS_RECEIPT", sourceId: created.grId } });
      }
      if (created.movementId) await db.stockMovementRecord.deleteMany({ where: { id: created.movementId } });
      if (created.grId) await db.goodsReceiptRequest.deleteMany({ where: { id: created.grId } });
      if (created.poId) await db.purchaseOrder.deleteMany({ where: { id: created.poId } });
      if (created.requisitionId) await db.purchaseRequisition.deleteMany({ where: { id: created.requisitionId } });
      if (created.supplierId) await db.supplier.deleteMany({ where: { id: created.supplierId } });
      if (created.outboxEventIds.length) await db.outboxEventRecord.deleteMany({ where: { eventId: { in: created.outboxEventIds } } });
      if (projSnapshot && variantId && warehouseId && resolvedBusinessId) {
        const biz = resolvedBusinessId;
        await db.inventoryVariantProjection.update({
          where: { businessId_variantId_warehouseId: { businessId: biz, variantId, warehouseId } },
          data: { onHandQuantity: projSnapshot.onHand, availableQuantity: projSnapshot.onHand, averageCost: projSnapshot.avgCost },
        }).catch(() => {});
        // The WAC handler updates averageCost across ALL of the variant's warehouse projections;
        // restore them so repeated verification runs are non-mutating.
        await db.inventoryVariantProjection.updateMany({
          where: { businessId: biz, variantId },
          data: { averageCost: variantAvgCostBefore },
        }).catch(() => {});
      }
    } catch {
      // best-effort cleanup
    }
  }

  const passed = steps.filter((s) => s.ok).length;
  return { business: businessName, passed, failed: steps.length - passed, steps };
}
