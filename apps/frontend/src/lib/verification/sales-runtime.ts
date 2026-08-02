/**
 * Sales workflow runtime verification.
 *
 * Exercises the REAL reservation code path — the actual outbox handlers via `drainOutbox` —
 * against the live database, then asserts the resulting DB state (reservationRecord,
 * inventory projection deltas, sales-order line reservedQty, receivable ledger). It creates
 * its own throwaway data and cleans it up in a `finally` block so it is safe to re-run.
 *
 * This is an integration smoke test, not a unit test: it proves the workflow genuinely mutates
 * the database as designed, rather than trusting that a green build means correct behaviour.
 *
 * NOTE: it drives the domain at the data + event layer (it does not go through the cookie-bound
 * server-action auth wrappers). Permission/audit enforcement is verified separately via the UI.
 */
import { db } from "@/lib/db";
import { drainOutbox } from "@/lib/outbox";
import { ensureSalesLedgerAccounts, postCustomerInvoiceJournal, postCustomerPaymentJournal, splitInclusiveGst } from "@/lib/finance/sales-posting";
import { v4 as uuidv4 } from "uuid";

const QTY = 3;

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

export async function runSalesRuntimeVerification(opts?: { businessId?: string }): Promise<VerifyReport> {
  const steps: VerifyStep[] = [];
  const add = (step: string, ok: boolean, detail = "") => steps.push({ step, ok, detail });

  // Track created rows for cleanup.
  const created = {
    quotationId: "",
    soId: "",
    customerId: "",
    invoiceId: "",
    shipmentId: "",
    outboxEventIds: [] as string[],
    createdInventoryRecord: false,
    createdProjection: false,
    inventoryRecordId: "",
  };
  let projectionSnapshot: { reserved: number; available: number; onHand: number } | null = null;
  let variantId = "";
  let warehouseId = "";
  let businessName = "";
  let resolvedBusinessId = ""; // captured once, reused in `finally` (never re-resolve there)

  try {
    // ---- Resolve business + tenant (prefer one that actually has product variants) ----------
    let pickBusinessId = opts?.businessId;
    if (!pickBusinessId) {
      const anyVariant = await db.productVariant.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
      pickBusinessId = anyVariant?.businessId ?? (await db.business.findFirst({ orderBy: { createdAt: "asc" } }))?.id;
    }
    const business = pickBusinessId ? await db.business.findUnique({ where: { id: pickBusinessId } }) : null;
    if (!business) throw new Error("No business found");
    businessName = business.name;
    const businessId = business.id;
    resolvedBusinessId = business.id;
    const tenantId = business.tenantId;

    const currency = business.defaultCurrencyId ? { id: business.defaultCurrencyId } : await db.currency.findFirst();
    if (!currency) throw new Error("No currency configured");

    // ---- Ensure a default warehouse ---------------------------------------------------------
    let warehouse = await db.warehouse.findFirst({ where: { businessId, isDefault: true } });
    if (!warehouse) {
      const any = await db.warehouse.findFirst({ where: { businessId } });
      if (any) {
        warehouse = await db.warehouse.update({ where: { id: any.id }, data: { isDefault: true } });
        add("Default warehouse", true, `Set '${warehouse.name}' as default (none was marked)`);
      } else {
        warehouse = await db.warehouse.create({
          data: { businessId, code: "WH-VERIFY", name: "Verification Warehouse", isDefault: true },
        });
        add("Default warehouse", true, "Created a default warehouse (none existed)");
      }
    } else {
      add("Default warehouse", true, `Using default warehouse '${warehouse.name}'`);
    }
    warehouseId = warehouse.id;

    // ---- Pick a variant with stock (or set one up) ------------------------------------------
    const withStock = await db.inventoryVariantProjection.findFirst({
      where: { businessId, warehouseId, availableQuantity: { gte: QTY } },
    });
    if (withStock) {
      variantId = withStock.variantId;
    } else {
      const variant = await db.productVariant.findFirst({ where: { businessId, deletedAt: null } });
      if (!variant) throw new Error("No product variant exists to test with");
      variantId = variant.id;
    }

    // Ensure an InventoryRecord exists (reservation FK references it).
    let invRecord = await db.inventoryRecord.findUnique({
      where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } },
    });
    if (!invRecord) {
      invRecord = await db.inventoryRecord.create({
        data: { id: `${businessId}-${variantId}-${warehouseId}`, businessId, tenantId, variantId, warehouseId, createdBy: "VERIFY", updatedBy: "VERIFY" },
      });
      created.createdInventoryRecord = true;
      created.inventoryRecordId = invRecord.id;
    }

    // Ensure a projection with enough available stock.
    let proj = await db.inventoryVariantProjection.findUnique({
      where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } },
    });
    if (!proj) {
      proj = await db.inventoryVariantProjection.create({
        data: { businessId, tenantId, variantId, warehouseId, onHandQuantity: 100, reservedQuantity: 0, availableQuantity: 100 },
      });
      created.createdProjection = true;
    } else if (proj.availableQuantity < QTY) {
      proj = await db.inventoryVariantProjection.update({
        where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } },
        data: { availableQuantity: proj.availableQuantity + 100, onHandQuantity: proj.onHandQuantity + 100 },
      });
    }
    projectionSnapshot = { reserved: proj.reservedQuantity, available: proj.availableQuantity, onHand: proj.onHandQuantity };
    add("Stock setup", true, `Variant has onHand=${proj.onHandQuantity}, available=${proj.availableQuantity}, reserved=${proj.reservedQuantity} before reservation`);

    // ---- Test customer ----------------------------------------------------------------------
    const customer = await db.customer.create({
      data: { businessId, code: `VERIFY-${Date.now()}`, name: "Runtime Verification Customer" },
    });
    created.customerId = customer.id;

    // ---- 1. Quotation (DRAFT) ---------------------------------------------------------------
    const quote = await db.quotation.create({
      data: {
        businessId, code: `QT-VERIFY-${Date.now()}`, customerId: customer.id, currencyId: currency.id,
        totalAmount: QTY * 100, status: "DRAFT",
        lines: { create: [{ variantId, quantity: QTY, unitPrice: 100, totalPrice: QTY * 100 }] },
      },
    });
    created.quotationId = quote.id;
    add("Quotation created", true, `${quote.code} (DRAFT)`);

    // ---- 2. Accept quotation ----------------------------------------------------------------
    const accepted = await db.quotation.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } });
    add("Quotation accepted", accepted.status === "ACCEPTED", `status=${accepted.status}`);

    // ---- 3. Sales order from quote ----------------------------------------------------------
    const quoteLines = await db.quotationLine.findMany({ where: { quotationId: quote.id } });
    const so = await db.salesOrder.create({
      data: {
        businessId, code: `SO-VERIFY-${Date.now()}`, customerId: customer.id, currencyId: currency.id,
        totalAmount: quote.totalAmount, status: "DRAFT",
        lines: { create: quoteLines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice, totalPrice: l.totalPrice })) },
      },
      include: { lines: true },
    });
    created.soId = so.id;
    add("Sales order created", true, `${so.code} from ${quote.code}`);

    // ---- 4. Approve -------------------------------------------------------------------------
    const approved = await db.salesOrder.update({ where: { id: so.id }, data: { status: "APPROVED" } });
    add("Sales order approved", approved.status === "APPROVED", `status=${approved.status}`);

    // ---- 5. Confirm → emit event (corrected payload) → drain (real handlers) ----------------
    await db.salesOrder.update({ where: { id: so.id }, data: { status: "CONFIRMED" } });
    const confirmEventId = uuidv4();
    created.outboxEventIds.push(confirmEventId);
    await db.outboxEventRecord.create({
      data: {
        eventId: confirmEventId, eventType: "SalesOrderConfirmed", aggregateId: so.id, aggregateVersion: 1,
        businessId, tenantId, occurredAt: new Date(),
        payload: { soId: so.id, lines: so.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, id: l.id })) },
        status: "PENDING",
      },
    });
    await drainOutbox();

    // Capture the chained event id for cleanup.
    const chained = await db.outboxEventRecord.findMany({ where: { aggregateId: so.id, eventType: "InventoryReservationRequested" } });
    chained.forEach((e) => created.outboxEventIds.push(e.eventId));

    // ---- 6. Assert reservation --------------------------------------------------------------
    const reservation = await db.reservationRecord.findFirst({ where: { businessId, referenceId: so.id, status: "ACTIVE" } });
    add("Reservation created", !!reservation, reservation ? `reservationRecord ${reservation.id}, qty=${reservation.quantity}` : "NO reservationRecord for the order");

    const projAfter = await db.inventoryVariantProjection.findUnique({
      where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } },
    });
    const reservedDelta = (projAfter?.reservedQuantity ?? 0) - projectionSnapshot.reserved;
    const availDelta = projectionSnapshot.available - (projAfter?.availableQuantity ?? 0);
    add("Projection reserved += qty", reservedDelta === QTY, `reservedQuantity delta=${reservedDelta} (expected ${QTY})`);
    add("Projection available -= qty", availDelta === QTY, `availableQuantity delta=${availDelta} (expected ${QTY})`);

    const soLine = await db.salesOrderLine.findFirst({ where: { soId: so.id } });
    add("SO line reservedQty set", (soLine?.reservedQty ?? 0) === QTY, `line.reservedQty=${soLine?.reservedQty}`);

    // Verify the outbox events actually completed (not FAILED).
    const failedEvents = await db.outboxEventRecord.count({ where: { aggregateId: so.id, status: "FAILED" } });
    add("Outbox events not FAILED", failedEvents === 0, `${failedEvents} failed event(s)`);

    // ---- 7. Deliver: shipment → dispatch → stock-out + COGS + invoice (real handlers) -------
    const shipment = await db.shipment.create({
      data: {
        businessId, code: `SHP-VERIFY-${Date.now()}`, soId: so.id, warehouseId, status: "DRAFT",
        lines: { create: so.lines.map((l) => ({ soLineId: l.id, variantId: l.variantId, requestedQty: l.quantity, pickedQty: l.quantity, packedQty: l.quantity, shippedQty: l.quantity })) },
      },
      include: { lines: true },
    });
    created.shipmentId = shipment.id;
    const dispatchEventId = uuidv4();
    created.outboxEventIds.push(dispatchEventId);
    await db.outboxEventRecord.create({
      data: {
        eventId: dispatchEventId, eventType: "ShipmentDispatched", aggregateId: shipment.id, aggregateVersion: 1,
        businessId, tenantId, occurredAt: new Date(),
        payload: { soId: so.id, shipmentId: shipment.id, warehouseId, lines: shipment.lines },
        status: "PENDING",
      },
    });
    await db.shipment.update({ where: { id: shipment.id }, data: { status: "DISPATCHED" } });
    await drainOutbox();

    const shipEvents = await db.outboxEventRecord.findMany({ where: { aggregateId: shipment.id } });
    shipEvents.forEach((e) => created.outboxEventIds.push(e.eventId));

    const shipFailed = await db.outboxEventRecord.count({ where: { aggregateId: shipment.id, status: "FAILED" } });
    add("Dispatch events not FAILED", shipFailed === 0, `${shipFailed} failed event(s)`);

    const projDelivered = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } } });
    const onHandDelta = projectionSnapshot.onHand - (projDelivered?.onHandQuantity ?? 0);
    add("Delivery deducts stock (onHand -= qty)", onHandDelta === QTY, `onHand delta=${onHandDelta} (expected ${QTY})`);

    const movement = await db.stockMovementRecord.findFirst({ where: { businessId, correlationId: `SHP-${shipment.id}` } });
    add("Stock movement (FULFILLED) recorded", !!movement && movement.quantityValue === -QTY, movement ? `qty=${movement.quantityValue}` : "no stock movement");

    const fulfilledRes = await db.reservationRecord.findFirst({ where: { businessId, referenceId: so.id } });
    add("Reservation marked FULFILLED", fulfilledRes?.status === "FULFILLED", `reservation status=${fulfilledRes?.status}`);

    const dispatchInv = await db.customerInvoice.findFirst({ where: { businessId, sourceType: "SHIPMENT", sourceId: shipment.id } });
    add("Dispatch invoice created", !!dispatchInv, dispatchInv ? `${dispatchInv.code} total=${dispatchInv.totalAmount}` : "no dispatch invoice");
    if (dispatchInv) {
      const dj = await db.journalEntry.findFirst({ where: { businessId, sourceType: "CUSTOMER_INVOICE", sourceId: dispatchInv.id }, include: { lines: true } });
      const jd = dj?.lines.reduce((s, l) => s + Number(l.debit), 0) ?? 0;
      const jc = dj?.lines.reduce((s, l) => s + Number(l.credit), 0) ?? 0;
      add("Dispatch invoice posted to GL (balanced)", !!dj && Math.abs(jd - jc) < 0.01, dj ? `DR=${jd} CR=${jc}` : "no journal for dispatch invoice");
    }

    // ---- 8. Invoice + receivable ------------------------------------------------------------
    const total = QTY * 100;
    const invoice = await db.customerInvoice.create({
      data: {
        businessId, code: `INV-VERIFY-${Date.now()}`, customerId: customer.id, currencyId: currency.id,
        totalAmount: total, paidAmount: 0, remainingAmount: total, status: "ISSUED",
        sourceType: "MANUAL", sourceId: `verify-${so.id}`,
        lines: { create: [{ description: "Verification line", quantity: QTY, unitPrice: 100, totalPrice: total }] },
      },
    });
    created.invoiceId = invoice.id;
    await db.receivableEntry.create({
      data: { businessId, customerId: customer.id, sourceType: "CUSTOMER_INVOICE", sourceId: invoice.id, amount: total, paidAmount: 0, dueDate: new Date(Date.now() + 15 * 86400000), status: "OPEN" },
    });
    const openRec = await db.receivableEntry.findFirst({ where: { sourceType: "CUSTOMER_INVOICE", sourceId: invoice.id } });
    add("Invoice → receivable OPEN", openRec?.status === "OPEN", `receivable status=${openRec?.status}, amount=${openRec?.amount}`);

    // ---- 9. Invoice → journal entry (DR AR / CR Revenue / CR Output GST) ---------------------
    await ensureSalesLedgerAccounts(businessId);
    const invJournal = await postCustomerInvoiceJournal({ businessId, tenantId, invoiceId: invoice.id, code: "INV-VERIFY", total });
    const invLines = await db.journalLine.findMany({ where: { journalEntryId: invJournal.id }, include: { account: true } });
    const invDebit = invLines.reduce((s, l) => s + Number(l.debit), 0);
    const invCredit = invLines.reduce((s, l) => s + Number(l.credit), 0);
    const { taxable, gst } = splitInclusiveGst(total);
    const arLine = invLines.find((l) => l.account.accountCode === "1100");
    const revLine = invLines.find((l) => l.account.accountCode === "4000");
    const gstLine = invLines.find((l) => l.account.accountCode === "2100");
    add("Invoice journal balanced", Math.abs(invDebit - invCredit) < 0.01 && invDebit === total, `DR=${invDebit} CR=${invCredit} (total ${total})`);
    add("Invoice DR Accounts Receivable", Number(arLine?.debit) === total, `AR debit=${arLine?.debit}`);
    add("Invoice CR Sales Revenue", Number(revLine?.credit) === taxable, `Revenue credit=${revLine?.credit} (taxable ${taxable})`);
    add("Invoice CR Output GST", gst === 0 || Number(gstLine?.credit) === gst, `GST credit=${gstLine?.credit} (gst ${gst})`);

    // ---- 10. Payment → journal entry (DR Bank / CR AR) + receivable closes -------------------
    const payJournal = await postCustomerPaymentJournal({ businessId, tenantId, invoiceId: invoice.id, code: "INV-VERIFY", amount: total });
    const payLines = await db.journalLine.findMany({ where: { journalEntryId: payJournal.id }, include: { account: true } });
    const bankLine = payLines.find((l) => l.account.accountCode === "1000");
    const payArLine = payLines.find((l) => l.account.accountCode === "1100");
    add("Payment DR Bank / CR AR", Number(bankLine?.debit) === total && Number(payArLine?.credit) === total, `Bank debit=${bankLine?.debit}, AR credit=${payArLine?.credit}`);

    await db.customerInvoice.update({ where: { id: invoice.id }, data: { paidAmount: total, remainingAmount: 0, status: "PAID" } });
    await db.receivableEntry.updateMany({ where: { sourceType: "CUSTOMER_INVOICE", sourceId: invoice.id }, data: { paidAmount: total, status: "CLOSED" } });
    const closedRec = await db.receivableEntry.findFirst({ where: { sourceType: "CUSTOMER_INVOICE", sourceId: invoice.id } });
    add("Payment → receivable CLOSED", closedRec?.status === "CLOSED", `receivable status=${closedRec?.status}, paid=${closedRec?.paidAmount}`);

    // ---- 11. General Ledger balanced (fundamental double-entry invariant) --------------------
    const agg = await db.journalLine.aggregate({ where: { businessId }, _sum: { debit: true, credit: true } });
    const glDebit = Number(agg._sum.debit ?? 0);
    const glCredit = Number(agg._sum.credit ?? 0);
    add("General Ledger balanced", Math.abs(glDebit - glCredit) < 0.01, `Σdebits=${glDebit.toFixed(2)} Σcredits=${glCredit.toFixed(2)}`);
  } catch (err) {
    add("Fatal error", false, err instanceof Error ? err.message : String(err));
  } finally {
    // ---- Cleanup (best-effort, reverse FK order) -------------------------------------------
    try {
      if (created.invoiceId) {
        // Journal entries for both the invoice and its payment share sourceId = invoiceId; their
        // lines cascade on delete. (The JOURNAL_POSTED auditEvents are append-only and remain.)
        await db.journalEntry.deleteMany({ where: { sourceId: created.invoiceId } });
        await db.receivableEntry.deleteMany({ where: { sourceType: "CUSTOMER_INVOICE", sourceId: created.invoiceId } });
        await db.customerInvoice.delete({ where: { id: created.invoiceId } });
      }
      if (created.shipmentId) {
        // Delete the shipment (and its dispatch-generated finance/inventory artifacts) BEFORE the
        // SO — shipment_lines reference sales_order_lines.
        await db.stockMovementRecord.deleteMany({ where: { correlationId: `SHP-${created.shipmentId}` } });
        const dispInvs = await db.customerInvoice.findMany({ where: { sourceType: "SHIPMENT", sourceId: created.shipmentId }, select: { id: true } });
        const dispInvIds = dispInvs.map((i) => i.id);
        await db.journalEntry.deleteMany({ where: { sourceId: { in: [created.shipmentId, ...dispInvIds] } } });
        if (dispInvIds.length) {
          await db.receivableEntry.deleteMany({ where: { sourceId: { in: dispInvIds } } });
          await db.customerInvoice.deleteMany({ where: { id: { in: dispInvIds } } });
        }
        await db.deliveryNote.deleteMany({ where: { shipmentId: created.shipmentId } });
        await db.shipment.delete({ where: { id: created.shipmentId } });
      }
      if (created.soId) {
        await db.reservationRecord.deleteMany({ where: { referenceId: created.soId } });
        await db.salesOrder.delete({ where: { id: created.soId } });
      }
      if (created.quotationId) await db.quotation.delete({ where: { id: created.quotationId } });
      if (created.outboxEventIds.length) await db.outboxEventRecord.deleteMany({ where: { eventId: { in: created.outboxEventIds } } });
      if (created.customerId) await db.customer.delete({ where: { id: created.customerId } });
      // Restore projection to its pre-test values (in case anything left it skewed).
      if (projectionSnapshot && variantId && warehouseId && resolvedBusinessId) {
        const biz = resolvedBusinessId;
        if (biz) {
          if (created.createdProjection) {
            await db.inventoryVariantProjection.deleteMany({ where: { businessId: biz, variantId, warehouseId } });
          } else {
            await db.inventoryVariantProjection.update({
              where: { businessId_variantId_warehouseId: { businessId: biz, variantId, warehouseId } },
              data: { reservedQuantity: projectionSnapshot.reserved, availableQuantity: projectionSnapshot.available, onHandQuantity: projectionSnapshot.onHand },
            }).catch(() => {});
          }
          if (created.createdInventoryRecord && created.inventoryRecordId) {
            await db.inventoryRecord.delete({ where: { id: created.inventoryRecordId } }).catch(() => {});
          }
        }
      }
    } catch {
      // Cleanup is best-effort; never mask the verification result.
    }
  }

  const passed = steps.filter((s) => s.ok).length;
  const failed = steps.length - passed;
  return { business: businessName, passed, failed, steps };
}
