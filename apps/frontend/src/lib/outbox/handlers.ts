import { db } from "@/lib/db";
import { registerHandler } from "./registry";
import { FinancialPostingService } from "../finance/posting-engine";
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
  
  // Update PO Lines
  let totalAccepted = 0;
  for (const line of acceptedLines) {
    if (line.poLineId && line.acceptedQty > 0) {
      const poLine = await db.purchaseOrderLine.findUnique({ where: { id: line.poLineId } });
      if (poLine) {
        await db.purchaseOrderLine.update({
          where: { id: line.poLineId },
          data: { receivedQty: poLine.receivedQty + line.acceptedQty }
        });
      }
      totalAccepted += line.acceptedQty;
    }
  }

  // Create SupplierBill (Idempotent)
  if (poId) {
    const po = await db.purchaseOrder.findUnique({ where: { id: poId }, include: { lines: true } });
    if (po) {
      const sourceId = payload.grId || event.aggregateId;
      const existingBill = await db.supplierBill.findFirst({ where: { sourceType: "GOODS_RECEIPT", sourceId } });
      if (!existingBill) {
        let totalAmount = 0;
        const billLines = [];
        for (const line of acceptedLines) {
          const poLine = po.lines.find(l => l.id === line.poLineId);
          if (poLine) {
            const lineTotal = line.acceptedQty * poLine.unitPrice;
            totalAmount += lineTotal;
            const inventoryAccount = await db.ledgerAccount.findFirst({ where: { businessId: event.businessId, accountCode: "1200" } });
            
            billLines.push({
              description: "Received Goods",
              quantity: line.acceptedQty,
              unitPrice: poLine.unitPrice,
              totalPrice: lineTotal,
              accountId: inventoryAccount?.id || po.supplierId // fallback for type safety
            });

            // WAC (Weighted Average Cost) Calculation
            if (line.variantId) {
              // Find or create global variant projection for WAC (we need it per business/variant)
              // Assuming we use a single global average cost per variant across warehouses for MVP
              const projs = await db.inventoryVariantProjection.findMany({
                where: { businessId: event.businessId, variantId: line.variantId }
              });
              
              if (projs.length > 0) {
                let totalOnHand = 0;
                let totalValue = 0;
                
                // Compute total current value
                for (const p of projs) {
                  totalOnHand += p.onHandQuantity;
                  totalValue += p.onHandQuantity * p.averageCost.toNumber();
                }

                const newTotalQty = totalOnHand + line.acceptedQty;
                const newTotalValue = totalValue + (line.acceptedQty * poLine.unitPrice);
                const newWac = newTotalQty > 0 ? (newTotalValue / newTotalQty) : poLine.unitPrice;

                // Update all warehouse projections for this variant with the new average cost
                await db.inventoryVariantProjection.updateMany({
                  where: { businessId: event.businessId, variantId: line.variantId },
                  data: { averageCost: new Prisma.Decimal(newWac) }
                });
              }
            }
          }
        }
        
        if (totalAmount > 0) {
          const suffix = Date.now().toString().slice(-6);
          await db.supplierBill.create({
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
          
          await db.outboxEventRecord.create({
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
  }

  // Update PO Status
  if (totalAccepted > 0 && poId) {
    const allPoLines = await db.purchaseOrderLine.findMany({ where: { poId } });
    const fullyReceived = allPoLines.every((l: any) => l.receivedQty >= l.quantity);
    
    await db.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED",
        updatedBy: "SYSTEM_INV_EVENT",
      }
    });
  }
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

    const inventoryId = `${event.businessId}-${line.variantId}-${warehouse.id}`;
    
    // Check available
    const proj = await db.inventoryVariantProjection.findUnique({
      where: { businessId_variantId_warehouseId: { businessId: event.businessId, variantId: line.variantId, warehouseId: warehouse.id } }
    });

    if (proj && proj.availableQuantity >= line.quantity) {
      // Create Reservation
      await db.reservationRecord.create({
        data: {
          id: `RES-${Date.now()}-${Math.random()}`,
          businessId: event.businessId,
          tenantId: event.tenantId,
          inventoryId,
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
  
  const shipment = await db.shipment.findUnique({ where: { id: shipmentId }, include: { lines: true } });

  // Trigger InventoryStockOutRequested
  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: "InventoryStockOutRequested",
      aggregateId: shipmentId,
      aggregateVersion: 1,
      businessId: event.businessId,
      tenantId: event.tenantId,
      occurredAt: new Date(),
      payload: { 
          shipmentId, 
          warehouseId: shipment?.warehouseId, 
          lines: shipment?.lines || [] 
      },
      status: "PENDING"
    }
  });

  // Create CustomerInvoice (Idempotent)
  if (soId) {
    const so = await db.salesOrder.findUnique({ where: { id: soId }, include: { lines: true } });
    if (so && shipment) {
      const existingInvoice = await db.customerInvoice.findFirst({ where: { sourceType: "SHIPMENT", sourceId: shipmentId } });
      if (!existingInvoice) {
        let totalAmount = 0;
        const invoiceLines = [];
        for (const line of shipment.lines) {
          const soLine = so.lines.find(l => l.id === line.soLineId);
          if (soLine) {
            const lineTotal = line.shippedQty * soLine.unitPrice;
            totalAmount += lineTotal;
            invoiceLines.push({
              description: "Shipped Goods",
              quantity: line.shippedQty,
              unitPrice: soLine.unitPrice,
              totalPrice: lineTotal
            });
          }
        }
        
        if (totalAmount > 0) {
          const suffix = Date.now().toString().slice(-6);
          await db.customerInvoice.create({
            data: {
              businessId: event.businessId,
              code: "INV-" + suffix,
              customerId: so.customerId,
              currencyId: so.currencyId,
              totalAmount,
              remainingAmount: totalAmount,
              sourceType: "SHIPMENT",
              sourceId: shipmentId,
              lines: {
                create: invoiceLines
              }
            }
          });
          
          await db.outboxEventRecord.create({
            data: {
              eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              eventType: "CustomerInvoiceCreated",
              aggregateId: shipmentId,
              aggregateVersion: 1,
              businessId: event.businessId,
              tenantId: event.tenantId,
              occurredAt: new Date(),
              payload: { invoiceTotal: totalAmount },
              status: "PENDING"
            }
          });
        }
      }

      // Generate COGS Posting
      let totalCogs = 0;
      for (const line of shipment.lines) {
        // Find projection to get average cost
        const proj = await db.inventoryVariantProjection.findFirst({
            where: { businessId: event.businessId, variantId: line.variantId }
        });
        const unitCost = proj ? proj.averageCost.toNumber() : 0;
        totalCogs += (line.shippedQty * unitCost);
      }

      if (totalCogs > 0) {
          await FinancialPostingService.postEntry({
              businessId: event.businessId,
              tenantId: event.tenantId,
              description: `COGS for Shipment ${shipmentId}`,
              sourceType: "SHIPMENT_DISPATCH",
              sourceId: shipmentId,
              lines: [
                  { accountCode: "5000", debit: totalCogs }, // 5000 COGS
                  { accountCode: "1200", credit: totalCogs } // 1200 Inventory Asset
              ]
          });
      }
    }
  }
});

registerHandler("InventoryStockOutRequested", async (event) => {
  const payload = event.payload as any;
  const { shipmentId, warehouseId, lines } = payload;
  
  const correlationId = `SHP-${shipmentId}`;

  for (const line of lines) {
    const inventoryId = `${event.businessId}-${line.variantId}-${warehouseId}`;
    
    // Deduct stock
    await db.stockMovementRecord.create({
      data: {
        id: `MOV-OUT-${Date.now()}-${Math.random()}`,
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

registerHandler("CustomerInvoiceCreated", async (event) => {
  const payload = event.payload as any;
  const { invoiceTotal } = payload;
  const invoiceId = event.aggregateId;

  const existingReceivable = await db.receivableEntry.findFirst({
      where: { sourceType: "CUSTOMER_INVOICE", sourceId: invoiceId }
  });

  if (!existingReceivable) {
      await db.receivableEntry.create({
          data: {
              businessId: event.businessId,
              sourceType: "CUSTOMER_INVOICE",
              sourceId: invoiceId,
              amount: new Prisma.Decimal(invoiceTotal),
              paidAmount: 0,
              status: "OPEN"
          }
      });

      await FinancialPostingService.postEntry({
          businessId: event.businessId,
              tenantId: event.tenantId,
              description: "Customer Invoice Created",
          sourceType: "CUSTOMER_INVOICE",
          sourceId: invoiceId,
          lines: [
              { accountCode: "1100", debit: invoiceTotal }, // 1100 Accounts Receivable
              { accountCode: "4000", credit: invoiceTotal } // 4000 Revenue
          ]
      });
  }
});

registerHandler("CustomerPaymentRecorded", async (event) => {
  const payload = event.payload as any;
  
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
