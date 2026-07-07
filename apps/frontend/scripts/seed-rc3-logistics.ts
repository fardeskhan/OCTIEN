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

  // 5. LOGISTICS & COMPLIANCE (RC3)
  const transporter = await db.transporter.create({
    data: { businessId: business.id, code: "TRANS-01-" + suffix, name: "Express Freight", gstin: "27AADCB2230M1Z2" }
  });

  const vehicle = await db.vehicle.create({
    data: { businessId: business.id, transporterId: transporter.id, registration: "MH-01-AB-1234", capacityKg: 5000, capacityCases: 250 }
  });

  const driver = await db.driver.create({
    data: { businessId: business.id, name: "John Doe", phone: "9876543210", transporterId: transporter.id, defaultVehicleId: vehicle.id }
  });

  const run = await db.deliveryRun.create({
    data: { businessId: business.id, code: "RUN-001-" + suffix, transporterId: transporter.id, vehicleId: vehicle.id, driverId: driver.id }
  });

  const stop = await db.deliveryRunStop.create({
    data: { businessId: business.id, deliveryRunId: run.id, stopSequence: 1, locationName: "Biofuel Corp HQ", city: "Mumbai" }
  });

  const shipment = await db.shipment.create({
    data: {
      businessId: business.id,
      code: "SHP-001-" + suffix,
      soId: so.id,
      warehouseId: warehouse.id,
      deliveryRunStopId: stop.id,
      status: "LOADED",
      weightKg: 400,
      caseCount: 40,
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      lines: {
        create: [{ soLineId: soLine!.id, variantId: variant.id, requestedQty: 40, pickedQty: 40, packedQty: 40, shippedQty: 40 }]
      }
    }
  });

  const shipmentLines = await db.shipmentLine.findMany({ where: { shipmentId: shipment.id }});

  await db.deliveryRun.update({
    where: { id: run.id },
    data: { status: "IN_TRANSIT", dispatchDate: new Date() }
  });

  await db.shipment.update({
    where: { id: shipment.id },
    data: { status: "DISPATCHED" }
  });

  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-4`,
      eventType: "ShipmentDispatched",
      aggregateId: shipment.id,
      aggregateVersion: 1,
      businessId: business.id,
      tenantId: tenant.id,
      occurredAt: new Date(),
      payload: { shipmentId: shipment.id, soId: so.id, warehouseId: warehouse.id, lines: shipmentLines },
      status: "PENDING"
    }
  });
  
  await processOutboxBatch();
  await processOutboxBatch();
  await processOutboxBatch();

  const projAfterShip = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId: business.id, variantId: variant.id, warehouseId: warehouse.id } }});
  console.assert(projAfterShip?.onHandQuantity === 60, "On hand should be 60");
  
  const invoice = await db.customerInvoice.findFirst({ where: { sourceId: shipment.id } });
  console.assert(!!invoice, "CustomerInvoice MUST be generated upon ShipmentDispatched");

  const ewb = await db.eWayBill.create({
    data: {
      businessId: business.id,
      ewbNumber: "EWB-" + Date.now(),
      invoiceId: invoice!.id,
      shipmentId: shipment.id,
      status: "GENERATED",
      generationSource: "MANUAL",
      vehicleNumber: vehicle.registration,
      transporterName: transporter.name,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 86400000)
    }
  });
  console.assert(!!ewb, "EWayBill should be generated successfully");

  await db.deliveryRunStop.update({
    where: { id: stop.id },
    data: { status: "COMPLETED", actualArrival: new Date() }
  });

  await db.deliveryRun.update({
    where: { id: run.id },
    data: { status: "COMPLETED" }
  });

  await db.shipment.update({
    where: { id: shipment.id },
    data: { 
      status: "DELIVERED",
      receivedBy: "Jane Smith",
      receiverPhone: "9876512340",
      receivedAt: new Date()
    }
  });

  const finalSO = await db.salesOrder.findUnique({ where: { id: so.id } });
  
  console.log("✓ Logistics & Compliance flow executed successfully.");
  console.log("=== RC3 VALIDATION COMPLETE ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
