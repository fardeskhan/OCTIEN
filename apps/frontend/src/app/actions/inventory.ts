// @ts-nocheck
"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { processOutboxBatch } from "@/lib/outbox";
import { revalidatePath } from "next/cache";

/**
 * Ensures an InventoryRecord exists for a given business/variant/warehouse combination.
 */
async function ensureInventoryRecord(tx: any, businessId: string, tenantId: string, variantId: string, warehouseId: string) {
  let record = await tx.inventoryRecord.findUnique({
    where: {
      businessId_variantId_warehouseId: { businessId, variantId, warehouseId }
    }
  });

  if (!record) {
    const id = `${businessId}-${variantId}-${warehouseId}`;
    record = await tx.inventoryRecord.create({
      data: {
        id,
        businessId,
        tenantId,
        variantId,
        warehouseId,
        createdBy: "SYSTEM",
        updatedBy: "SYSTEM",
      }
    });
  }
  return record;
}

/**
 * Updates the read model projection for a specific variant in a specific warehouse.
 */
async function updateVariantProjection(tx: any, businessId: string, tenantId: string, variantId: string, warehouseId: string) {
  // Aggregate all stock movements for this inventory record to calculate On Hand
  const inventoryId = `${businessId}-${variantId}-${warehouseId}`;
  
  const movements = await tx.stockMovementRecord.aggregate({
    where: { inventoryId },
    _sum: { quantityValue: true }
  });

  const onHand = movements._sum.quantityValue || 0;

  // Find all ACTIVE reservations for this inventory record
  const reservations = await tx.reservationRecord.aggregate({
    where: { inventoryId, status: "ACTIVE" },
    _sum: { quantity: true }
  });

  const reserved = reservations._sum.quantity || 0;
  const available = onHand - reserved;

  await tx.inventoryVariantProjection.upsert({
    where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } },
    create: {
      businessId,
      tenantId,
      variantId,
      warehouseId,
      onHandQuantity: onHand,
      reservedQuantity: reserved,
      availableQuantity: available,
    },
    update: {
      onHandQuantity: onHand,
      reservedQuantity: reserved,
      availableQuantity: available,
      rebuiltAt: new Date()
    }
  });
}

export async function adjustInventory(variantId: string, warehouseId: string, quantity: number, unit: string) {
  const { currentBusinessId, tenantId, session } = await requireBusinessContext();
  await requirePermission("inventory.update");

  await db.$transaction(async (tx) => {
    const inventory = await ensureInventoryRecord(tx, currentBusinessId, tenantId, variantId, warehouseId);

    const movementId = `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await tx.stockMovementRecord.create({
      data: {
        id: movementId,
        businessId: currentBusinessId,
        tenantId,
        inventoryId: inventory.id,
        variantId,
        warehouseId,
        type: quantity > 0 ? "RECEIVED" : "ADJUSTED",
        quantityValue: quantity,
        quantityUnit: unit,
        actorId: session.userId,
      }
    });

    await updateVariantProjection(tx, currentBusinessId, tenantId, variantId, warehouseId);
  });

  revalidatePath("/dashboard/inventory");
  await processOutboxBatch();
  return { success: true };
}

export async function transferInventory(variantId: string, sourceWarehouseId: string, targetWarehouseId: string, quantity: number, unit: string) {
  const { currentBusinessId, tenantId, session } = await requireBusinessContext();
  await requirePermission("inventory.update");

  if (quantity <= 0) throw new Error("Transfer quantity must be positive");

  await db.$transaction(async (tx) => {
    // 1. Verify source has enough
    const sourceProjection = await tx.inventoryVariantProjection.findUnique({
      where: { businessId_variantId_warehouseId: { businessId: currentBusinessId, variantId, warehouseId: sourceWarehouseId } }
    });

    if (!sourceProjection || sourceProjection.availableQuantity < quantity) {
      throw new Error("Insufficient available stock in source warehouse");
    }

    const sourceInventory = await ensureInventoryRecord(tx, currentBusinessId, tenantId, variantId, sourceWarehouseId);
    const targetInventory = await ensureInventoryRecord(tx, currentBusinessId, tenantId, variantId, targetWarehouseId);

    const timestamp = Date.now();
    const correlationId = `TRF-${timestamp}`;

    // 2. Deduct from source
    await tx.stockMovementRecord.create({
      data: {
        id: `MOV-OUT-${timestamp}`,
        businessId: currentBusinessId,
        tenantId,
        inventoryId: sourceInventory.id,
        variantId,
        warehouseId: sourceWarehouseId,
        type: "TRANSFERRED_OUT",
        quantityValue: -quantity,
        quantityUnit: unit,
        actorId: session.userId,
        correlationId,
      }
    });

    // 3. Add to target
    await tx.stockMovementRecord.create({
      data: {
        id: `MOV-IN-${timestamp}`,
        businessId: currentBusinessId,
        tenantId,
        inventoryId: targetInventory.id,
        variantId,
        warehouseId: targetWarehouseId,
        type: "RECEIVED",
        quantityValue: quantity,
        quantityUnit: unit,
        actorId: session.userId,
        correlationId,
      }
    });

    await updateVariantProjection(tx, currentBusinessId, tenantId, variantId, sourceWarehouseId);
    await updateVariantProjection(tx, currentBusinessId, tenantId, variantId, targetWarehouseId);
  });

  revalidatePath("/dashboard/inventory");
  await processOutboxBatch();
  return { success: true };
}

/**
 * SIMULATES: Inventory Processing a Goods Receipt Request
 * This function belongs to CAP-INVENTORY.
 * It physically receives the items and emits an 'InventoryReceived' event
 * back to CAP-PROCUREMENT to update the PO.
 */
export async function processGoodsReceiptRequest(grId: string, acceptedLines: { id: string, acceptedQty: number, rejectedQty: number }[]) {
  const { currentBusinessId, tenantId, session } = await requireBusinessContext();
  await requirePermission("inventory.update");

  await db.$transaction(async (tx: any) => {
    const gr = await tx.goodsReceiptRequest.findUnique({
      where: { id: grId, businessId: currentBusinessId },
      include: { lines: true, purchaseOrder: true }
    });

    if (!gr || gr.status !== "REQUESTED") throw new Error("Invalid Goods Receipt Request");

    const timestamp = Date.now();
    const correlationId = `GR-${timestamp}`;

    let totalAccepted = 0;

    for (const inputLine of acceptedLines) {
      const line = gr.lines.find((l: any) => l.id === inputLine.id);
      if (!line) continue;

      const varianceQty = line.requestedQty - (inputLine.acceptedQty + inputLine.rejectedQty);

      await tx.goodsReceiptLine.update({
        where: { id: line.id },
        data: {
          acceptedQty: inputLine.acceptedQty,
          rejectedQty: inputLine.rejectedQty,
          varianceQty
        }
      });

      if (inputLine.acceptedQty > 0) {
        const inventory = await ensureInventoryRecord(tx, currentBusinessId, tenantId, line.variantId, gr.warehouseId);

        await tx.stockMovementRecord.create({
          data: {
            id: `MOV-IN-${timestamp}-${line.id}`,
            businessId: currentBusinessId,
            tenantId,
            inventoryId: inventory.id,
            variantId: line.variantId,
            warehouseId: gr.warehouseId,
            type: "RECEIVED",
            quantityValue: inputLine.acceptedQty,
            quantityUnit: "pcs",
            actorId: session.userId,
            correlationId,
          }
        });

        await updateVariantProjection(tx, currentBusinessId, tenantId, line.variantId, gr.warehouseId);
      }

      totalAccepted += inputLine.acceptedQty;
    }

    await tx.goodsReceiptRequest.update({
      where: { id: grId },
      data: {
        status: "COMPLETED",
        receivedAt: new Date(),
        updatedBy: session.userId,
      }
    });

    if (totalAccepted > 0) {
      await tx.outboxEventRecord.create({
        data: {
          eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          eventType: "GoodsReceiptCompleted",
          aggregateId: gr.id,
          aggregateVersion: 1,
          businessId: currentBusinessId,
          tenantId: tenantId,
          occurredAt: new Date(),
          payload: { poId: gr.poId, acceptedLines },
          status: "PENDING"
        }
      });
    }
  });

  revalidatePath("/dashboard/procurement/receipts");
  revalidatePath("/dashboard/inventory");
  await processOutboxBatch();
  return { success: true };
}

export async function processGoodsReceipt(grId: string, acceptedLines: { id: string, acceptedQty: number, rejectedQty: number }[]) {
  const { currentBusinessId, tenantId, session } = await requireBusinessContext();
  await requirePermission("inventory.update");

  await db.$transaction(async (tx) => {
    const gr = await tx.goodsReceiptRequest.findUnique({
      where: { id: grId, businessId: currentBusinessId },
      include: { lines: true, purchaseOrder: true }
    });

    if (!gr || gr.status !== "REQUESTED") throw new Error("Invalid Goods Receipt Request");

    const timestamp = Date.now();
    const correlationId = `GR-${gr.id}-${timestamp}`;

    let totalAccepted = 0;

    for (const inputLine of acceptedLines) {
      const line = gr.lines.find(l => l.id === inputLine.id);
      if (!line) continue;

      const varianceQty = line.requestedQty - (inputLine.acceptedQty + inputLine.rejectedQty);

      await tx.goodsReceiptLine.update({
        where: { id: line.id },
        data: {
          acceptedQty: inputLine.acceptedQty,
          rejectedQty: inputLine.rejectedQty,
          varianceQty
        }
      });

      if (inputLine.acceptedQty > 0) {
        // Physical stock increase in Inventory!
        const inventory = await ensureInventoryRecord(tx, currentBusinessId, tenantId, line.variantId, gr.warehouseId);

        await tx.stockMovementRecord.create({
          data: {
            id: `MOV-IN-${line.id}-${timestamp}`,
            businessId: currentBusinessId,
            tenantId,
            inventoryId: inventory.id,
            variantId: line.variantId,
            warehouseId: gr.warehouseId,
            type: "RECEIVED",
            quantityValue: inputLine.acceptedQty,
            quantityUnit: "pcs", // Needs real unit mapping in prod
            actorId: session.userId,
            correlationId,
          }
        });
      }
    }
  });

  return { success: true };
}
