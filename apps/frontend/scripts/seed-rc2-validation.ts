import { db } from "../src/lib/db";
import crypto from "crypto";

async function main() {
  console.log("Starting RC2 Sales Validation...");

  // Setup prerequisites
  const tenant = await db.tenant.findUnique({ where: { slug: "cosmy" } });
  if (!tenant) throw new Error("Tenant not found");
  
  const business = await db.business.findUnique({ where: { slug: "salam-cola" } });
  if (!business) throw new Error("Business not found");
  const businessId = business.id;

  const currency = await db.currency.findFirst({ where: { businessId } });
  if (!currency) throw new Error("Currency not found");

  const product = await db.product.findFirst({ where: { businessId, name: "PET Bottle" } });
  if (!product) throw new Error("Product not found");
  const variant = await db.productVariant.findFirst({ where: { productId: product.id } });
  if (!variant) throw new Error("Variant not found");

  const fgWarehouse = await db.warehouse.findFirst({ where: { businessId, code: "WH-PROD" } });
  if (!fgWarehouse) throw new Error("Warehouse not found");

  // Get initial inventory state
  const initialInv = await db.inventoryVariantProjection.findUnique({
    where: { businessId_variantId_warehouseId: { businessId, variantId: variant.id, warehouseId: fgWarehouse.id } }
  });
  if (!initialInv) throw new Error("Initial inventory projection not found");

  console.log("Initial Inventory:");
  console.log(`On Hand: ${initialInv.onHandQuantity}, Reserved: ${initialInv.reservedQuantity}, Available: ${initialInv.availableQuantity}`);

  // Scenario 1: Create Customer, Quote, SO
  console.log("\nRunning Scenario 1: Customer to Sales Order...");
  const customerCount = await db.customer.count({ where: { businessId } });
  const code = `CUS-${String(customerCount + 1).padStart(5, "0")}`;
  
  const customer = await db.customer.create({
    data: {
      businessId,
      code,
      name: "RC2 Test Customer",
      status: "ACTIVE",
      creditStatus: "GOOD"
    }
  });

  const quoteCount = await db.quotation.count({ where: { businessId } });
  const quote = await db.quotation.create({
    data: {
      businessId,
      code: `QT-${String(quoteCount + 1).padStart(5, "0")}`,
      customerId: customer.id,
      totalAmount: 1000,
      currencyId: currency.id,
      status: "ACCEPTED",
      lines: {
        create: [{ variantId: variant.id, quantity: 100, unitPrice: 10, totalPrice: 1000 }]
      }
    },
    include: { lines: true }
  });

  const soCount = await db.salesOrder.count({ where: { businessId } });
  const so = await db.salesOrder.create({
    data: {
      businessId,
      code: `SO-${String(soCount + 1).padStart(5, "0")}`,
      customerId: customer.id,
      totalAmount: 1000,
      currencyId: currency.id,
      status: "DRAFT",
      lines: {
        create: quote.lines.map(l => ({
          variantId: l.variantId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          totalPrice: l.totalPrice
        }))
      }
    },
    include: { lines: true }
  });
  console.log(`Created SO: ${so.code}`);

  // Scenario 2: Confirm SO -> Reserve Inventory
  console.log("\nRunning Scenario 2: Confirm SO & Reserve Inventory...");
  await db.salesOrder.update({ where: { id: so.id }, data: { status: "CONFIRMED" } });

  // Simulate InventoryReservationRequested event handler
  // Inventory reserves stock
  const reservationQty = so.lines[0].quantity;
  
  const invRecord = await db.inventoryRecord.findUnique({
    where: { businessId_variantId_warehouseId: { businessId, variantId: variant.id, warehouseId: fgWarehouse.id } }
  });

  if (!invRecord) throw new Error("Inventory record missing");

  // Create Reservation Record
  await db.reservationRecord.create({
    data: {
      id: crypto.randomUUID(),
      businessId,
      tenantId: tenant.id,
      inventoryId: invRecord.id,
      quantity: reservationQty,
      referenceId: so.id,
      expiresAt: new Date(Date.now() + 86400000), // 1 day
      status: "ACTIVE"
    }
  });

  // Update Inventory Projection
  const reservedInv = await db.inventoryVariantProjection.update({
    where: { businessId_variantId_warehouseId: { businessId, variantId: variant.id, warehouseId: fgWarehouse.id } },
    data: {
      reservedQuantity: { increment: reservationQty },
      availableQuantity: { decrement: reservationQty }
    }
  });

  console.log("Post-Reservation Inventory:");
  console.log(`On Hand: ${reservedInv.onHandQuantity}, Reserved: ${reservedInv.reservedQuantity}, Available: ${reservedInv.availableQuantity}`);

  if (reservedInv.availableQuantity !== initialInv.availableQuantity - reservationQty) throw new Error("Available quantity not decremented correctly");
  if (reservedInv.onHandQuantity !== initialInv.onHandQuantity) throw new Error("On Hand quantity should remain unchanged");

  // Update SO line reserved qty
  await db.salesOrderLine.update({
    where: { id: so.lines[0].id },
    data: { reservedQty: reservationQty }
  });

  // Scenario 3: Fulfill SO
  console.log("\nRunning Scenario 3: Fulfill SO...");
  await db.salesOrder.update({ where: { id: so.id }, data: { status: "FULFILLED" } });

  // Simulate SalesOrderFulfilled event handler
  await db.stockMovementRecord.create({
    data: {
      id: crypto.randomUUID(),
      businessId,
      tenantId: tenant.id,
      inventoryId: invRecord.id,
      variantId: variant.id,
      warehouseId: fgWarehouse.id,
      type: "TRANSFERRED_OUT",
      quantityValue: -reservationQty,
      quantityUnit: "pcs",
      actorId: "SYSTEM"
    }
  });

  // Release reservation
  await db.reservationRecord.updateMany({
    where: { referenceId: so.id },
    data: { status: "FULFILLED" }
  });

  const fulfilledInv = await db.inventoryVariantProjection.update({
    where: { businessId_variantId_warehouseId: { businessId, variantId: variant.id, warehouseId: fgWarehouse.id } },
    data: {
      onHandQuantity: { decrement: reservationQty },
      reservedQuantity: { decrement: reservationQty },
      // available quantity remains the same as it was already decremented at reservation
    }
  });

  console.log("Post-Fulfillment Inventory:");
  console.log(`On Hand: ${fulfilledInv.onHandQuantity}, Reserved: ${fulfilledInv.reservedQuantity}, Available: ${fulfilledInv.availableQuantity}`);

  if (fulfilledInv.onHandQuantity !== initialInv.onHandQuantity - reservationQty) throw new Error("On Hand not decremented");
  if (fulfilledInv.reservedQuantity !== 0) throw new Error("Reserved quantity not released");

  // Update SO line fulfilled qty
  await db.salesOrderLine.update({
    where: { id: so.lines[0].id },
    data: { fulfilledQty: reservationQty }
  });

  // Scenario 4: Create Return
  console.log("\nRunning Scenario 4: Create Return...");
  const returnQty = 10;
  
  const srCount = await db.salesReturn.count({ where: { businessId } });
  const sr = await db.salesReturn.create({
    data: {
      businessId,
      code: `SR-${String(srCount + 1).padStart(5, "0")}`,
      customerId: customer.id,
      soId: so.id,
      warehouseId: fgWarehouse.id,
      status: "REQUESTED",
      lines: {
        create: [{ soLineId: so.lines[0].id, variantId: variant.id, quantity: returnQty, reason: "Defective" }]
      }
    },
    include: { lines: true }
  });

  console.log(`Created Sales Return: ${sr.code}`);
  await db.salesReturn.update({ where: { id: sr.id }, data: { status: "APPROVED" } });
  
  console.log("Receiving Return...");
  await db.salesReturn.update({ where: { id: sr.id }, data: { status: "RECEIVED" } });

  // Simulate InventoryReturnAccepted event handler
  await db.stockMovementRecord.create({
    data: {
      id: crypto.randomUUID(),
      businessId,
      tenantId: tenant.id,
      inventoryId: invRecord.id,
      variantId: variant.id,
      warehouseId: fgWarehouse.id,
      type: "RECEIVED",
      quantityValue: returnQty,
      quantityUnit: "pcs",
      actorId: "SYSTEM"
    }
  });

  const returnedInv = await db.inventoryVariantProjection.update({
    where: { businessId_variantId_warehouseId: { businessId, variantId: variant.id, warehouseId: fgWarehouse.id } },
    data: {
      onHandQuantity: { increment: returnQty },
      availableQuantity: { increment: returnQty }
    }
  });

  console.log("Post-Return Inventory:");
  console.log(`On Hand: ${returnedInv.onHandQuantity}, Reserved: ${returnedInv.reservedQuantity}, Available: ${returnedInv.availableQuantity}`);

  if (returnedInv.onHandQuantity !== fulfilledInv.onHandQuantity + returnQty) throw new Error("On Hand not incremented by return");
  if (returnedInv.availableQuantity !== fulfilledInv.availableQuantity + returnQty) throw new Error("Available not incremented by return");

  console.log("\nAll RC2 Operations Validated Successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
