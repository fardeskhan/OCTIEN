import { db } from "@/lib/db";
import { registerHandler } from "./registry";
import { FinancialPostingService } from "../finance/posting-engine";
import { ensureSalesLedgerAccounts, postCustomerInvoiceJournal } from "../finance/sales-posting";
import { weightedAverageCost } from "../finance/wac";
import { Prisma } from "@prisma/client";

registerHandler("PurchaseOrderApproved", async (event) => {
  // No-op for now. In future, might notify budget or finance.
  console.log("Handled PurchaseOrderApproved", event.eventId);
});

registerHandler("GoodsReceiptRequested", async (event) => {
  // No-op for now. Inventory UI pulls GR requests directly.
  console.log("Handled GoodsReceiptRequested", event.eventId);
});

registerHandler("GoodsReceiptCompleted", async (event) => {
  const payload = event.payload as any;
  const { poId, acceptedLines } = payload;
  const grSourceId = payload.grId || event.aggregateId;

  // Atomicity + idempotency: the entire receipt → PO-line → WAC → supplier-bill → PO-status
  // transition commits or rolls back as ONE unit. A failure anywhere leaves NO partial writes, so a
  // retry re-runs from a clean state and yields the same final state as a single success. Combined
  // with the guard below (a supplier bill already exists for this GR ⇒ full no-op) this gives
  // exactly-once effect on replay: PO receivedQty, WAC and the bill are never applied twice.
  await db.$transaction(async (tx) => {
    const alreadyProcessed = await tx.supplierBill.findFirst({ where: { businessId: event.businessId, sourceType: "GOODS_RECEIPT", sourceId: grSourceId } });
    if (alreadyProcessed) return;

    // Update PO Lines
    let totalAccepted = 0;
    for (const line of acceptedLines) {
      if (line.poLineId && line.acceptedQty > 0) {
        const poLine = await tx.purchaseOrderLine.findUnique({ where: { id: line.poLineId } });
        if (poLine) {
          await tx.purchaseOrderLine.update({
            where: { id: line.poLineId },
            data: { receivedQty: poLine.receivedQty + line.acceptedQty }
          });
        }
        totalAccepted += line.acceptedQty;
      }
    }

    // Create SupplierBill (we already returned above if one exists for this GR)
    if (poId) {
      const po = await tx.purchaseOrder.findUnique({ where: { id: poId }, include: { lines: true } });
      if (po) {
        const sourceId = grSourceId;
        let totalAmount = 0;
        const billLines = [];
        // Received qty + extended cost per variant across ALL accepted lines; blended into WAC once
        // after this loop (a single GR may carry multiple lines for the same variant).
        const receivedByVariant = new Map<string, { qty: number; value: number }>();
        const inventoryAccount = await tx.ledgerAccount.findFirst({ where: { businessId: event.businessId, accountCode: "1200" } });
        for (const line of acceptedLines) {
          const poLine = po.lines.find(l => l.id === line.poLineId);
          if (poLine) {
            const lineTotal = line.acceptedQty * poLine.unitPrice;
            totalAmount += lineTotal;
            billLines.push({
              description: "Received Goods",
              quantity: line.acceptedQty,
              unitPrice: poLine.unitPrice,
              totalPrice: lineTotal,
              accountId: inventoryAccount?.id || po.supplierId // fallback for type safety
            });

            // WAC: accumulate received qty + extended cost per variant here; the actual blend happens
            // ONCE per variant after this loop (see below) so multiple lines for the same variant in
            // one GR are averaged correctly rather than compounding per line.
            if (line.variantId && line.acceptedQty > 0) {
              const agg = receivedByVariant.get(line.variantId) ?? { qty: 0, value: 0 };
              agg.qty += line.acceptedQty;
              agg.value += line.acceptedQty * poLine.unitPrice;
              receivedByVariant.set(line.variantId, agg);
            }
          }
        }

        // WAC per variant — aggregate ALL accepted lines for the same variant FIRST, then blend
        // once. Doing it per line drifts the average when one receipt has multiple lines for the
        // same variant (each line would treat the others' just-received qty as pre-existing stock at
        // the interim WAC). onHand already includes this receipt, so prevQty = totalOnHand − received.
        for (const [variantId, recv] of receivedByVariant) {
          const projs = await tx.inventoryVariantProjection.findMany({
            where: { businessId: event.businessId, variantId }
          });
          if (projs.length === 0) continue;
          let totalOnHand = 0;
          let totalValue = 0;
          for (const p of projs) {
            totalOnHand += p.onHandQuantity;
            totalValue += p.onHandQuantity * p.averageCost.toNumber();
          }
          const blendedUnitCost = recv.qty > 0 ? recv.value / recv.qty : 0;
          const oldWac = totalOnHand > 0 ? totalValue / totalOnHand : blendedUnitCost;
          const prevQty = Math.max(0, totalOnHand - recv.qty);
          const newWac = weightedAverageCost(prevQty, oldWac, recv.qty, blendedUnitCost);
          await tx.inventoryVariantProjection.updateMany({
            where: { businessId: event.businessId, variantId },
            data: { averageCost: new Prisma.Decimal(newWac) }
          });
        }

        if (totalAmount > 0) {
          const suffix = Date.now().toString().slice(-6);
          await tx.supplierBill.create({
            data: {
              businessId: event.businessId,
              code: "BIL-" + suffix,
              supplierId: po.supplierId,
              currencyId: po.currencyId,
              totalAmount,
              remainingAmount: totalAmount,
              sourceType: "GOODS_RECEIPT",
              sourceId,
              lines: {
                create: billLines
              }
            }
          });

          await tx.outboxEventRecord.create({
            data: {
              eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              eventType: "SupplierBillCreated",
              aggregateId: sourceId,
              aggregateVersion: 1,
              businessId: event.businessId,
              tenantId: event.tenantId,
              occurredAt: new Date(),
              payload: { billTotal: totalAmount },
              status: "PENDING"
            }
          });
        }
      }
    }

    // Update PO Status
    if (totalAccepted > 0 && poId) {
      const allPoLines = await tx.purchaseOrderLine.findMany({ where: { poId } });
      const fullyReceived = allPoLines.every((l: any) => l.receivedQty >= l.quantity);

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED",
          updatedBy: "SYSTEM_INV_EVENT",
        }
      });
    }
  });
});

registerHandler("InventoryTransferred", async (event) => {
  console.log("Handled InventoryTransferred", event.eventId);
});

registerHandler("SalesOrderConfirmed", async (event) => {
  // Translate Sales Order Confirmed -> InventoryReservationRequested
  // The simplest way is to directly reserve inventory here for MVP.
  const payload = event.payload as any;
  const { soId, lines } = payload;
  
  // Here we should reserve inventory.
  // We'll emit InventoryReservationRequested from here or just do it.
  // The user recommended emitting InventoryReservationRequested between Sales and Inventory.
  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: "InventoryReservationRequested",
      aggregateId: soId,
      aggregateVersion: 1,
      businessId: event.businessId,
      tenantId: event.tenantId,
      occurredAt: new Date(),
      payload: { soId, lines },
      status: "PENDING"
    }
  });
});

registerHandler("InventoryReservationRequested", async (event) => {
  const payload = event.payload as any;
  const { soId, lines } = payload;
  
  for (const line of lines) {
    // Attempt to reserve in default warehouse for MVP
    const warehouse = await db.warehouse.findFirst({ where: { businessId: event.businessId, isDefault: true } });
    if (!warehouse) continue;

    // ReservationRecord.inventoryId is a FK to InventoryRecord. Look up the REAL record by its
    // unique key instead of constructing a synthetic `${businessId}-${variantId}-${warehouseId}`
    // id — that only matches records created via ensureInventoryRecord, NOT seeded ones
    // (id `INV-<slug>-<n>`), which silently failed the FK and left stock un-reserved.
    const invRecord = await db.inventoryRecord.findUnique({
      where: { businessId_variantId_warehouseId: { businessId: event.businessId, variantId: line.variantId, warehouseId: warehouse.id } }
    });
    if (!invRecord) continue;

    // Idempotency guard: a replayed reservation event must not create a second reservation for the
    // same order + inventory record (which would double the reserved quantity and starve available
    // stock). The key is one live reservation per (order, inventory) — ACTIVE (still holding stock)
    // or FULFILLED (already shipped). A CANCELLED/EXPIRED reservation does NOT block, so a legitimate
    // re-reservation after cancellation is still allowed.
    const existingRes = await db.reservationRecord.findFirst({
      where: { businessId: event.businessId, referenceId: soId, inventoryId: invRecord.id, status: { in: ["ACTIVE", "FULFILLED"] } }
    });
    if (existingRes) continue;

    // Check available
    const proj = await db.inventoryVariantProjection.findUnique({
      where: { businessId_variantId_warehouseId: { businessId: event.businessId, variantId: line.variantId, warehouseId: warehouse.id } }
    });

    if (proj && proj.availableQuantity >= line.quantity) {
      // Create Reservation
      await db.reservationRecord.create({
        data: {
          id: `RES-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
          businessId: event.businessId,
          tenantId: event.tenantId,
          inventoryId: invRecord.id,
          referenceId: soId,
          quantity: line.quantity,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
        }
      });
      
      // Update projection
      await db.inventoryVariantProjection.update({
        where: { businessId_variantId_warehouseId: { businessId: event.businessId, variantId: line.variantId, warehouseId: warehouse.id } },
        data: {
          reservedQuantity: proj.reservedQuantity + line.quantity,
          availableQuantity: proj.availableQuantity - line.quantity
        }
      });

      // Update SO Line reservedQty
      await db.salesOrderLine.update({
        where: { id: line.id },
        data: { reservedQty: line.quantity }
      });
    }
  }
});

registerHandler("ShipmentCreated", async (event) => {
  console.log("Handled ShipmentCreated", event.eventId);
});

registerHandler("ShipmentDispatched", async (event) => {
  const payload = event.payload as any;
  const { soId, shipmentId } = payload;

  const shipment = await db.shipment.findFirst({ where: { id: shipmentId, businessId: event.businessId }, include: { lines: true } });
  if (!shipment) return;

  // Ledger accounts (idempotent upserts) before the transaction.
  await ensureSalesLedgerAccounts(event.businessId);

  // Atomic + idempotent: the stock-out request, the shipment invoice + its journal, and COGS all
  // commit or roll back together. Each sub-step is guarded so a replayed/redelivered ShipmentDispatched
  // is a no-op — no duplicate stock-out event, invoice, invoice journal or COGS journal. (This replaces
  // the previous non-transactional version, where a mid-handler failure left a partial state.)
  await db.$transaction(async (tx) => {
    // 1. Request inventory stock-out — once per shipment (was emitted unconditionally before).
    const stockOutRequested = await tx.outboxEventRecord.findFirst({
      where: { businessId: event.businessId, eventType: "InventoryStockOutRequested", aggregateId: shipmentId },
    });
    if (!stockOutRequested) {
      await tx.outboxEventRecord.create({
        data: {
          eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          eventType: "InventoryStockOutRequested",
          aggregateId: shipmentId,
          aggregateVersion: 1,
          businessId: event.businessId,
          tenantId: event.tenantId,
          occurredAt: new Date(),
          payload: { shipmentId, warehouseId: shipment.warehouseId, lines: shipment.lines },
          status: "PENDING",
        },
      });
    }

    if (!soId) return;
    const so = await tx.salesOrder.findFirst({ where: { id: soId, businessId: event.businessId }, include: { lines: true } });
    if (!so) return;

    // 2. Shipment invoice + its GL journal — once per shipment.
    const existingInvoice = await tx.customerInvoice.findFirst({ where: { sourceType: "SHIPMENT", sourceId: shipmentId } });
    if (!existingInvoice) {
      let totalAmount = 0;
      const invoiceLines = [];
      for (const line of shipment.lines) {
        const soLine = so.lines.find((l) => l.id === line.soLineId);
        if (soLine) {
          const lineTotal = line.shippedQty * soLine.unitPrice;
          totalAmount += lineTotal;
          invoiceLines.push({ description: "Shipped Goods", quantity: line.shippedQty, unitPrice: soLine.unitPrice, totalPrice: lineTotal });
        }
      }
      if (totalAmount > 0) {
        const suffix = Date.now().toString().slice(-6);
        const newInvoice = await tx.customerInvoice.create({
          data: {
            businessId: event.businessId,
            code: "INV-" + suffix,
            customerId: so.customerId,
            currencyId: so.currencyId,
            totalAmount,
            remainingAmount: totalAmount,
            sourceType: "SHIPMENT",
            sourceId: shipmentId,
            lines: { create: invoiceLines },
          },
        });
        // AR subledger keyed by the INVOICE id (matches createCustomerInvoice). This replaces the
        // retired CustomerInvoiceCreated event, whose handler keyed the receivable + a second
        // AR/Revenue journal by shipmentId — double-posting revenue for shipment invoices.
        await tx.receivableEntry.create({
          data: {
            businessId: event.businessId,
            customerId: so.customerId,
            sourceType: "CUSTOMER_INVOICE",
            sourceId: newInvoice.id,
            amount: totalAmount,
            paidAmount: 0,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 15)),
            status: "OPEN",
          },
        });
        // Exactly ONE invoice journal, inside THIS transaction (DR AR / CR Revenue / CR Output GST).
        await postCustomerInvoiceJournal({ businessId: event.businessId, tenantId: event.tenantId, invoiceId: newInvoice.id, code: newInvoice.code, total: totalAmount, tx });
      }
    }

    // 3. COGS — once per shipment, keyed by (SHIPMENT_DISPATCH, shipmentId), posted in THIS tx.
    let totalCogs = 0;
    for (const line of shipment.lines) {
      const proj = await tx.inventoryVariantProjection.findFirst({ where: { businessId: event.businessId, variantId: line.variantId } });
      const unitCost = proj ? proj.averageCost.toNumber() : 0;
      totalCogs += line.shippedQty * unitCost;
    }
    const existingCogs = await tx.journalEntry.findFirst({ where: { businessId: event.businessId, sourceType: "SHIPMENT_DISPATCH", sourceId: shipmentId } });
    if (totalCogs > 0 && !existingCogs) {
      await FinancialPostingService.postEntry({
        businessId: event.businessId,
        tenantId: event.tenantId,
        tx,
        description: `COGS for Shipment ${shipmentId}`,
        sourceType: "SHIPMENT_DISPATCH",
        sourceId: shipmentId,
        lines: [
          { accountCode: "5000", debit: totalCogs }, // 5000 COGS
          { accountCode: "1200", credit: totalCogs }, // 1200 Inventory Asset
        ],
      });
    }
  });
});

registerHandler("InventoryStockOutRequested", async (event) => {
  const payload = event.payload as any;
  const { shipmentId, warehouseId, lines } = payload;

  const correlationId = `SHP-${shipmentId}`;

  // Idempotency guard (Priority #1 — stock-OUT replay protection): once stock has been moved out for
  // this shipment, a replayed event must NOT create a second movement or deduct the projection
  // again. Movement ids were previously Date.now()-based (never colliding), so replay silently
  // double-deducted. Keying off the deterministic per-shipment correlationId and no-op'ing the whole
  // handler on replay makes stock-out retry-safe.
  const alreadyOut = await db.stockMovementRecord.findFirst({ where: { businessId: event.businessId, correlationId } });
  if (alreadyOut) return;

  for (const line of lines) {
    // StockMovementRecord.inventoryId is a FK to InventoryRecord — resolve the REAL record by its
    // unique key (a synthetic `${businessId}-${variantId}-${warehouseId}` id FK-fails for seeded
    // inventory, the same bug fixed for reservations).
    const invRecord = await db.inventoryRecord.findUnique({
      where: { businessId_variantId_warehouseId: { businessId: event.businessId, variantId: line.variantId, warehouseId } }
    });
    if (!invRecord) continue;
    const inventoryId = invRecord.id;

    // Deduct stock
    await db.stockMovementRecord.create({
      data: {
        id: `MOV-OUT-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
        businessId: event.businessId,
        tenantId: event.tenantId,
        inventoryId,
        variantId: line.variantId,
        warehouseId,
        type: "FULFILLED",
        quantityValue: -line.shippedQty,
        quantityUnit: "pcs",
        actorId: "SYSTEM_INV",
        correlationId
      }
    });

    // Fetch shipment to get soId
    const shipment = await db.shipment.findUnique({ where: { id: shipmentId } });
    
    // Clear reservation
    const res = await db.reservationRecord.findFirst({
      where: { referenceId: shipment?.soId, inventoryId, status: "ACTIVE" }
    });
    if (res) {
      await db.reservationRecord.update({
        where: { id: res.id },
        data: { status: "FULFILLED" }
      });
    }

    // Update projection
    const proj = await db.inventoryVariantProjection.findUnique({
      where: { businessId_variantId_warehouseId: { businessId: event.businessId, variantId: line.variantId, warehouseId } }
    });
    if (proj) {
      await db.inventoryVariantProjection.update({
        where: { businessId_variantId_warehouseId: { businessId: event.businessId, variantId: line.variantId, warehouseId } },
        data: {
          onHandQuantity: proj.onHandQuantity - line.shippedQty,
          reservedQuantity: Math.max(0, proj.reservedQuantity - line.shippedQty)
        }
      });
    }
  }

  // Trigger InventoryStockOutCompleted
  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: "InventoryStockOutCompleted",
      aggregateId: shipmentId,
      aggregateVersion: 1,
      businessId: event.businessId,
      tenantId: event.tenantId,
      occurredAt: new Date(),
      payload,
      status: "PENDING"
    }
  });
});

registerHandler("InventoryStockOutCompleted", async (event) => {
  // Update shipment status if needed, though ShipmentDispatched usually means it's already dispatched.
  console.log("Handled InventoryStockOutCompleted", event.eventId);
});

registerHandler("ShipmentDelivered", async (event) => {
  const payload = event.payload as any;
  const { soId } = payload;
  
  // Update Sales Order to FULFILLED if all lines delivered (simplification for MVP: just mark it FULFILLED)
  if (soId) {
    await db.salesOrder.update({
      where: { id: soId },
      data: { status: "FULFILLED" }
    });
  }
});

registerHandler("SupplierBillApproved", async (event) => {
  const payload = event.payload as any;
  const { billId, amount } = payload;
  
  // Create PayableEntry
  const existingPayable = await db.payableEntry.findFirst({
      where: { sourceType: "SUPPLIER_BILL", sourceId: billId }
  });

  if (!existingPayable) {
      await db.payableEntry.create({
          data: {
              businessId: event.businessId,
              sourceType: "SUPPLIER_BILL",
              sourceId: billId,
              amount: new Prisma.Decimal(amount),
              paidAmount: 0,
              status: "OPEN"
          }
      });

      // Post Journal Entry: DR Inventory Asset, CR Accounts Payable
      await FinancialPostingService.postEntry({
          businessId: event.businessId,
              tenantId: event.tenantId,
              description: "Supplier Bill Approved",
          sourceType: "SUPPLIER_BILL",
          sourceId: billId,
          lines: [
              { accountCode: "1200", debit: amount }, // 1200 Inventory Asset
              { accountCode: "2000", credit: amount } // 2000 Accounts Payable
          ]
      });
  }
});

registerHandler("SupplierPaymentRegistered", async (event) => {
  const payload = event.payload as any;

  // Idempotency guard: don't post the payment journal twice on event replay.
  const existing = await db.journalEntry.findFirst({ where: { businessId: event.businessId, sourceType: "SUPPLIER_PAYMENT", sourceId: payload.paymentId } });
  if (existing) return;

  await FinancialPostingService.postEntry({
      businessId: event.businessId,
              tenantId: event.tenantId,
              description: "Supplier Payment",
      sourceType: "SUPPLIER_PAYMENT",
      sourceId: payload.paymentId,
      lines: [
          { accountCode: "2000", debit: payload.amount }, // 2000 Accounts Payable
          { accountCode: "1000", credit: payload.amount } // 1000 Cash/Bank
      ]
  });
});

// CustomerInvoiceCreated handler RETIRED (double-post fix). It posted a SECOND AR/Revenue journal
// keyed by the event aggregateId (= shipmentId), on top of the invoice journal ShipmentDispatched
// already posts via postCustomerInvoiceJournal (keyed by invoiceId, WITH GST split) — double-counting
// AR and revenue for shipment invoices, and mis-keying the receivable by shipmentId. ShipmentDispatched
// now creates the receivable inline (by invoiceId) and no longer emits this event; the direct invoice
// path (createCustomerInvoice) never used it. Only emitter was ShipmentDispatched (verified), so no
// handler is registered — any stray in-flight event is a harmless no-op (processor logs "no handler").

registerHandler("CustomerPaymentRecorded", async (event) => {
  const payload = event.payload as any;

  // Idempotency guard: don't post the receipt journal twice on event replay.
  const existing = await db.journalEntry.findFirst({ where: { businessId: event.businessId, sourceType: "CUSTOMER_PAYMENT", sourceId: payload.paymentId } });
  if (existing) return;

  await FinancialPostingService.postEntry({
      businessId: event.businessId,
              tenantId: event.tenantId,
              description: "Customer Payment",
      sourceType: "CUSTOMER_PAYMENT",
      sourceId: payload.paymentId,
      lines: [
          { accountCode: "1000", debit: payload.amount }, // 1000 Cash/Bank
          { accountCode: "1100", credit: payload.amount } // 1100 Accounts Receivable
      ]
  });
});
