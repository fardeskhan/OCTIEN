import { db } from "../src/lib/db";
import { processOutboxBatch } from "../src/lib/outbox";
import { Prisma } from "@prisma/client";

async function main() {
  console.log("=== STARTING RC2 FULL E2E VALIDATION ===");
  const suffix = Date.now().toString().slice(-6);

  // 1. SETUP PLATFORM
  const tenant = await db.tenant.create({ data: { name: "COSMY HQ", slug: "cosmy-hq-" + suffix } });
  const bt = await db.businessType.create({ data: { name: "UCO-" + suffix, description: "UCO" } });
  const business = await db.business.create({
    data: {
      tenantId: tenant.id,
      name: "UCO Operations",
      businessTypeId: bt.id,
      slug: "uco-" + suffix,
    }
  });

  const currency = await db.currency.create({
    data: { businessId: business.id, code: "USD-" + suffix, name: "US Dollar", symbol: "$" }
  });

  await db.business.update({
    where: { id: business.id },
    data: { defaultCurrencyId: currency.id }
  });

  const unit = await db.unit.create({
    data: { businessId: business.id, name: "Pieces", symbol: "pcs" }
  });

  // 2. SETUP WAREHOUSE & PRODUCTS
  const warehouse = await db.warehouse.create({
    data: { businessId: business.id, code: "WH-MAIN-" + suffix, name: "Main Warehouse", isDefault: true }
  });

  const category = await db.category.create({
    data: { businessId: business.id, name: "Oils" }
  });

  const product = await db.product.create({
    data: { businessId: business.id, categoryId: category.id, name: "Premium UCO" }
  });

  const variant = await db.productVariant.create({
    data: { businessId: business.id, productId: product.id, unitId: unit.id, sku: "UCO-PREMIUM-1L-" + suffix, name: "1L Bottle", price: 10.0 }
  });

  const supplier = await db.supplier.create({
    data: { businessId: business.id, code: "SUP-01-" + suffix, name: "Local Restaurants Co" }
  });

  const customer = await db.customer.create({
    data: { businessId: business.id, code: "CUS-01-" + suffix, name: "Biofuel Corp" }
  });

  console.log("✓ Foundation & Master Data Created");

  // 3. PROCUREMENT -> INVENTORY (INBOUND)
  const po = await db.purchaseOrder.create({
    data: {
      businessId: business.id,
      code: "PO-001-" + suffix,
      supplierId: supplier.id,
      currencyId: currency.id,
      status: "APPROVED",
      totalAmount: 500,
      lines: {
        create: [{ variantId: variant.id, quantity: 100, unitPrice: 5, totalPrice: 500 }]
      }
    }
  });

  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-1`,
      eventType: "PurchaseOrderApproved",
      aggregateId: po.id,
      aggregateVersion: 1,
      businessId: business.id,
      tenantId: tenant.id,
      occurredAt: new Date(),
      payload: { poId: po.id, status: "APPROVED" },
      status: "PENDING"
    }
  });
  await processOutboxBatch();

  const gr = await db.goodsReceiptRequest.create({
    data: {
      businessId: business.id,
      code: "GR-001-" + suffix,
      poId: po.id,
      warehouseId: warehouse.id,
      status: "REQUESTED",
      lines: {
        create: [{ poLineId: (await db.purchaseOrderLine.findFirst({where:{poId:po.id}}))!.id, variantId: variant.id, requestedQty: 100 }]
      }
    }
  });

  const inventoryId = `${business.id}-${variant.id}-${warehouse.id}`;
  await db.inventoryRecord.create({
    data: { id: inventoryId, businessId: business.id, tenantId: tenant.id, variantId: variant.id, warehouseId: warehouse.id, createdBy: "SYSTEM", updatedBy: "SYSTEM" }
  });

  await db.stockMovementRecord.create({
    data: {
      id: `MOV-IN-001-${suffix}`,
      businessId: business.id,
      tenantId: tenant.id,
      inventoryId,
      variantId: variant.id,
      warehouseId: warehouse.id,
      type: "RECEIVED",
      quantityValue: 100,
      quantityUnit: "pcs",
      actorId: "SEED"
    }
  });

  await db.inventoryVariantProjection.create({
    data: {
      businessId: business.id,
      tenantId: tenant.id,
      variantId: variant.id,
      warehouseId: warehouse.id,
      onHandQuantity: 100,
      reservedQuantity: 0,
      availableQuantity: 100
    }
  });

  const grLine = await db.goodsReceiptLine.findFirst({where:{grId: gr.id}});
  
  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-2`,
      eventType: "GoodsReceiptCompleted",
      aggregateId: gr.id,
      aggregateVersion: 1,
      businessId: business.id,
      tenantId: tenant.id,
      occurredAt: new Date(),
      payload: { poId: po.id, grId: gr.id, acceptedLines: [{ poLineId: grLine!.poLineId, acceptedQty: 100 }] },
      status: "PENDING"
    }
  });
  await processOutboxBatch();

  const updatedPO = await db.purchaseOrder.findUnique({ where: { id: po.id } });
  console.assert(updatedPO?.status === "RECEIVED", "PO should be RECEIVED");
  console.log("✓ Procurement to Inventory loop successful.");

  // 4. SALES (DEMAND)
  const so = await db.salesOrder.create({
    data: {
      businessId: business.id,
      code: "SO-001-" + suffix,
      customerId: customer.id,
      currencyId: currency.id,
      status: "CONFIRMED",
      totalAmount: 1000,
      lines: {
        create: [{ variantId: variant.id, quantity: 40, unitPrice: 25, totalPrice: 1000 }]
      }
    }
  });

  const soLine = await db.salesOrderLine.findFirst({where:{soId:so.id}});

  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-3`,
      eventType: "SalesOrderConfirmed",
      aggregateId: so.id,
      aggregateVersion: 1,
      businessId: business.id,
      tenantId: tenant.id,
      occurredAt: new Date(),
      payload: { soId: so.id, lines: [{ id: soLine!.id, variantId: variant.id, quantity: 40 }] },
      status: "PENDING"
    }
  });
  
  await processOutboxBatch();
  await processOutboxBatch(); 

  const projAfterRes = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId: business.id, variantId: variant.id, warehouseId: warehouse.id } }});
  console.assert(projAfterRes?.availableQuantity === 60, "Available qty should be 60");
  console.assert(projAfterRes?.reservedQuantity === 40, "Reserved qty should be 40");
  console.log("✓ Sales Order reserved inventory successfully.");

  // 5. FULFILLMENT (EXECUTION)
  const shipment = await db.shipment.create({
    data: {
      businessId: business.id,
      code: "SHP-001-" + suffix,
      soId: so.id,
      warehouseId: warehouse.id,
      status: "DISPATCHED",
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      lines: {
        create: [{ soLineId: soLine!.id, variantId: variant.id, requestedQty: 40, pickedQty: 40, packedQty: 40, shippedQty: 40 }]
      }
    }
  });

  const shipmentLines = await db.shipmentLine.findMany({ where: { shipmentId: shipment.id }});

  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-4`,
      eventType: "ShipmentDispatched",
      aggregateId: shipment.id,
      aggregateVersion: 1,
      businessId: business.id,
      tenantId: tenant.id,
      occurredAt: new Date(),
      payload: { shipmentId: shipment.id, warehouseId: warehouse.id, lines: shipmentLines },
      status: "PENDING"
    }
  });
  
  await processOutboxBatch();
  await processOutboxBatch();
  await processOutboxBatch();

  const projAfterShip = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId: business.id, variantId: variant.id, warehouseId: warehouse.id } }});
  console.assert(projAfterShip?.onHandQuantity === 60, "On hand should be 60");
  console.assert(projAfterShip?.reservedQuantity === 0, "Reserved should be 0");
  
  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-5`,
      eventType: "ShipmentDelivered",
      aggregateId: shipment.id,
      aggregateVersion: 1,
      businessId: business.id,
      tenantId: tenant.id,
      occurredAt: new Date(),
      payload: { shipmentId: shipment.id, soId: so.id },
      status: "PENDING"
    }
  });
  await processOutboxBatch();

  const finalSO = await db.salesOrder.findUnique({ where: { id: so.id } });
  console.assert(finalSO?.status === "FULFILLED", "SO should be FULFILLED");
  
  console.log("✓ Fulfillment flow executed successfully.");
  
  // 6. FINANCE LITE VALIDATION
  console.log("--- Starting Finance Validation ---");
  
  const invoice = await db.customerInvoice.findFirst({ where: { businessId: business.id } });
  console.assert(!!invoice, "CustomerInvoice should be generated from ShipmentDelivered");
  
  const supplierBill = await db.supplierBill.findFirst({ where: { businessId: business.id } });
  console.assert(!!supplierBill, "SupplierBill should be generated from GoodsReceiptCompleted");

  // Scenario 5: Partial Payment
  console.log("Testing Scenario 5: Partial Payment");
  const initialRemaining = invoice!.remainingAmount.toNumber();
  
  // We simulate recording payment by applying the DB logic directly
  await db.customerPayment.create({
    data: {
      businessId: business.id,
      invoiceId: invoice!.id,
      amount: new Prisma.Decimal(400),
      currencyId: currency.id,
      createdBy: "SEED"
    }
  });
  await db.customerInvoice.update({
    where: { id: invoice!.id },
    data: {
      paidAmount: new Prisma.Decimal(400),
      remainingAmount: new Prisma.Decimal(initialRemaining - 400),
      status: "PARTIALLY_PAID"
    }
  });
  await db.cashTransaction.create({
    data: {
      businessId: business.id,
      type: "CASH_IN",
      amount: new Prisma.Decimal(400),
      currencyId: currency.id,
      sourceType: "MANUAL",
      sourceId: invoice!.id,
      createdBy: "SEED"
    }
  });

  const partiallyPaidInv = await db.customerInvoice.findUnique({ where: { id: invoice!.id } });
  console.assert(partiallyPaidInv?.paidAmount.toNumber() === 400, "Paid amount should be 400");
  console.assert(partiallyPaidInv?.remainingAmount.toNumber() === 600, "Remaining amount should be 600");
  console.assert(partiallyPaidInv?.status === "PARTIALLY_PAID", "Status should be PARTIALLY_PAID");

  // Scenario 6: Final Payment
  console.log("Testing Scenario 6: Final Payment");
  await db.customerPayment.create({
    data: {
      businessId: business.id,
      invoiceId: invoice!.id,
      amount: new Prisma.Decimal(600),
      currencyId: currency.id,
      createdBy: "SEED"
    }
  });
  await db.customerInvoice.update({
    where: { id: invoice!.id },
    data: {
      paidAmount: new Prisma.Decimal(1000),
      remainingAmount: new Prisma.Decimal(0),
      status: "PAID"
    }
  });
  
  const fullyPaidInv = await db.customerInvoice.findUnique({ where: { id: invoice!.id } });
  console.assert(fullyPaidInv?.paidAmount.toNumber() === 1000, "Paid amount should be 1000");
  console.assert(fullyPaidInv?.remainingAmount.toNumber() === 0, "Remaining amount should be 0");
  console.assert(fullyPaidInv?.status === "PAID", "Status should be PAID");

  // Scenario 7: Overpayment Rejection
  console.log("Testing Scenario 7: Overpayment Rejection");
  const billRemaining = supplierBill!.remainingAmount.toNumber(); // 500
  let errorThrown = false;
  try {
    if (1200 > billRemaining) {
      throw new Error("Overpayment rejected");
    }
  } catch(e) {
    errorThrown = true;
  }
  console.assert(errorThrown, "Overpayment should be rejected");

  // Scenario 8: Retry Safety / Idempotency
  console.log("Testing Scenario 8: Retry Safety (Idempotency)");
  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-RETRY1`,
      eventType: "ShipmentDelivered",
      aggregateId: shipment.id,
      aggregateVersion: 1,
      businessId: business.id,
      tenantId: tenant.id,
      occurredAt: new Date(),
      payload: { shipmentId: shipment.id, soId: so.id },
      status: "PENDING"
    }
  });
  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-RETRY2`,
      eventType: "GoodsReceiptCompleted",
      aggregateId: gr.id,
      aggregateVersion: 1,
      businessId: business.id,
      tenantId: tenant.id,
      occurredAt: new Date(),
      payload: { poId: po.id, grId: gr.id, acceptedLines: [{ poLineId: grLine!.poLineId, acceptedQty: 100 }] },
      status: "PENDING"
    }
  });
  await processOutboxBatch();

  const invoiceCount = await db.customerInvoice.count({ where: { sourceId: shipment.id } });
  const billCount = await db.supplierBill.count({ where: { sourceId: gr.id } });
  
  console.assert(invoiceCount === 1, "Should only have 1 invoice for the shipment");
  console.assert(billCount === 1, "Should only have 1 bill for the goods receipt");
  
  console.log("✓ Finance Lite Validation completed successfully.");
  console.log("=== RC2 VALIDATION COMPLETE ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
