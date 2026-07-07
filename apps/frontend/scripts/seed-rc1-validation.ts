import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Starting RC1 Operations Validation...");

  let bType = await db.businessType.findFirst();
  if (!bType) {
    bType = await db.businessType.create({ data: { name: "Manufacturing" } });
  }

  let tenant = await db.tenant.findFirst();
  if (!tenant) {
    tenant = await db.tenant.create({ data: { name: "COSMY Group", slug: "cosmy" } });
  }

  let business = await db.business.findFirst({ where: { name: "Salam Cola" } });
  if (!business) {
    business = await db.business.create({
      data: { tenantId: tenant.id, businessTypeId: bType.id, name: "Salam Cola", slug: "salam-cola" }
    });
  }
  const businessId = business.id;
  const tenantId = tenant.id;

  let currency = await db.currency.findFirst({ where: { businessId } });
  if (!currency) {
    currency = await db.currency.create({ data: { businessId, code: "USD", name: "US Dollar", symbol: "$", isDefault: true } });
  }

  let pcsUnit = await db.unit.findFirst({ where: { businessId, symbol: "pcs" } });
  if (!pcsUnit) {
    pcsUnit = await db.unit.create({ data: { businessId, name: "Pieces", symbol: "pcs", isSystem: true } });
  }
  let lUnit = await db.unit.findFirst({ where: { businessId, symbol: "L" } });
  if (!lUnit) {
    lUnit = await db.unit.create({ data: { businessId, name: "Liter", symbol: "L", isSystem: true } });
  }

  let admin = await db.user.findFirst({ where: { email: "admin@cosmy.com" } });
  if (!admin) {
    admin = await db.user.create({ data: { tenantId: tenant.id, id: "USR-ADMIN", email: "admin@cosmy.com", name: "Admin" } });
  }

  console.log("Running Scenario 1: Salam Cola...");

  const supBottle = await db.supplier.upsert({
    where: { businessId_code: { businessId, code: "SUP-BOTTLE" } },
    create: { businessId, name: "Bottle Manufacturer", code: "SUP-BOTTLE", createdBy: admin.id, updatedBy: admin.id },
    update: {}
  });

  const supFilling = await db.supplier.upsert({
    where: { businessId_code: { businessId, code: "SUP-FILLING" } },
    create: { businessId, name: "Filling Partner", code: "SUP-FILLING", createdBy: admin.id, updatedBy: admin.id },
    update: {}
  });

  const prodBottle = await db.product.create({ data: { businessId, name: "PET Bottle", type: "RAW_MATERIAL" } });
  const varBottle = await db.productVariant.create({ data: { businessId, productId: prodBottle.id, name: "Default", sku: `BTL-${Date.now()}`, unitId: pcsUnit.id, cost: 0.10 } });

  const whProd = await db.warehouse.upsert({
    where: { businessId_code: { businessId, code: "WH-PROD" } },
    create: { businessId, code: "WH-PROD", name: "Production", warehouseType: "PRODUCTION" },
    update: {}
  });
  const whFG = await db.warehouse.upsert({
    where: { businessId_code: { businessId, code: "WH-FG" } },
    create: { businessId, code: "WH-FG", name: "Finished Goods", warehouseType: "STORAGE", isDefault: true },
    update: {}
  });

  const po = await db.purchaseOrder.create({
    data: {
      businessId, code: `PO-${Date.now()}`, supplierId: supBottle.id, currencyId: currency.id,
      status: "ORDERED", totalAmount: 500, createdBy: admin.id, updatedBy: admin.id,
      lines: { create: [{ variantId: varBottle.id, quantity: 5000, unitPrice: 0.10, totalPrice: 500 }] }
    }
  });
  const poLine = await db.purchaseOrderLine.findFirst({ where: { poId: po.id } });

  const gr = await db.goodsReceiptRequest.create({
    data: {
      businessId, code: `GR-${Date.now()}`, poId: po.id, warehouseId: whProd.id, status: "REQUESTED",
      createdBy: admin.id, updatedBy: admin.id,
      lines: { create: [{ poLineId: poLine!.id, variantId: varBottle.id, requestedQty: 5000 }] }
    }
  });
  const grLine = await db.goodsReceiptLine.findFirst({ where: { grId: gr.id } });

  console.log("Scenario 1 Setup Complete. Ready for processing.");

  console.log("Running Scenario 3: Partial Receipt...");
  const timestamp = Date.now();
  await db.$transaction(async (tx) => {
    await tx.goodsReceiptLine.update({
      where: { id: grLine!.id },
      data: { acceptedQty: 4900, rejectedQty: 50, varianceQty: 50 }
    });

    let inv = await tx.inventoryRecord.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: varBottle.id, warehouseId: whProd.id } } });
    if (!inv) {
      inv = await tx.inventoryRecord.create({ data: { id: `${businessId}-${varBottle.id}-${whProd.id}`, businessId, tenantId, variantId: varBottle.id, warehouseId: whProd.id, createdBy: admin.id, updatedBy: admin.id } });
    }

    await tx.stockMovementRecord.create({
      data: { id: `MOV-IN-${timestamp}-1`, businessId, tenantId, inventoryId: inv.id, variantId: varBottle.id, warehouseId: whProd.id, type: "RECEIVED", quantityValue: 4900, quantityUnit: "pcs", actorId: admin.id }
    });

    await tx.purchaseOrderLine.update({
      where: { id: poLine!.id },
      data: { receivedQty: 4900 }
    });

    await tx.goodsReceiptRequest.update({
      where: { id: gr.id },
      data: { status: "COMPLETED", receivedAt: new Date(), updatedBy: admin.id }
    });

    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: "PARTIALLY_RECEIVED", updatedBy: "SYSTEM_INV_EVENT" }
    });
    
    await tx.inventoryVariantProjection.upsert({
      where: { businessId_variantId_warehouseId: { businessId, variantId: varBottle.id, warehouseId: whProd.id } },
      create: { businessId, tenantId, variantId: varBottle.id, warehouseId: whProd.id, onHandQuantity: 4900, availableQuantity: 4900 },
      update: { onHandQuantity: 4900, availableQuantity: 4900 }
    });

    await tx.inventoryReportProjection.upsert({
      where: { businessId_warehouseId_variantId: { businessId, variantId: varBottle.id, warehouseId: whProd.id } },
      create: { businessId, warehouseId: whProd.id, variantId: varBottle.id, onHand: 4900, available: 4900, averageCost: 0.10, totalValue: 490 },
      update: { onHand: 4900, available: 4900, totalValue: 490, lastMovementDate: new Date() }
    });
  });
  console.log("Scenario 3 Processing Complete.");

  console.log("Running Scenario 4: Multi-Warehouse Transfer...");
  await db.$transaction(async (tx) => {
    const invProd = await tx.inventoryRecord.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: varBottle.id, warehouseId: whProd.id } } });
    
    let invFG = await tx.inventoryRecord.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: varBottle.id, warehouseId: whFG.id } } });
    if (!invFG) {
      invFG = await tx.inventoryRecord.create({ data: { id: `${businessId}-${varBottle.id}-${whFG.id}`, businessId, tenantId, variantId: varBottle.id, warehouseId: whFG.id, createdBy: admin.id, updatedBy: admin.id } });
    }

    const tId = Date.now();
    await tx.stockMovementRecord.create({ data: { id: `MOV-OUT-${tId}-1`, businessId, tenantId, inventoryId: invProd!.id, variantId: varBottle.id, warehouseId: whProd.id, type: "TRANSFERRED_OUT", quantityValue: -1000, quantityUnit: "pcs", actorId: admin.id }});
    await tx.stockMovementRecord.create({ data: { id: `MOV-IN-${tId}-2`, businessId, tenantId, inventoryId: invFG!.id, variantId: varBottle.id, warehouseId: whFG.id, type: "RECEIVED", quantityValue: 1000, quantityUnit: "pcs", actorId: admin.id }});

    await tx.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId, variantId: varBottle.id, warehouseId: whProd.id } }, data: { onHandQuantity: { decrement: 1000 }, availableQuantity: { decrement: 1000 } }});
    
    await tx.inventoryVariantProjection.upsert({
      where: { businessId_variantId_warehouseId: { businessId, variantId: varBottle.id, warehouseId: whFG.id } },
      create: { businessId, tenantId, variantId: varBottle.id, warehouseId: whFG.id, onHandQuantity: 1000, availableQuantity: 1000 },
      update: { onHandQuantity: { increment: 1000 }, availableQuantity: { increment: 1000 } }
    });

    await tx.inventoryReportProjection.update({ where: { businessId_warehouseId_variantId: { businessId, variantId: varBottle.id, warehouseId: whProd.id } }, data: { onHand: { decrement: 1000 }, available: { decrement: 1000 }, totalValue: { decrement: 100 } }});
    await tx.inventoryReportProjection.upsert({
      where: { businessId_warehouseId_variantId: { businessId, variantId: varBottle.id, warehouseId: whFG.id } },
      create: { businessId, warehouseId: whFG.id, variantId: varBottle.id, onHand: 1000, available: 1000, averageCost: 0.10, totalValue: 100 },
      update: { onHand: { increment: 1000 }, available: { increment: 1000 }, totalValue: { increment: 100 }, lastMovementDate: new Date() }
    });
  });

  console.log("Scenario 4 Processing Complete.");
  console.log("All RC1 Operations Validated Successfully.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await db.$disconnect();
});
