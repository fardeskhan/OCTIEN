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
  // Aggregate all stock movements for this variant+warehouse to calculate On Hand.
  // IMPORTANT: filter by the (businessId, variantId, warehouseId) columns the movement carries, NOT
  // a synthetic `${businessId}-${variantId}-${warehouseId}` inventoryId. Seeded InventoryRecords use
  // ids like `INV-<slug>-<n>`, so their movements never matched the synthetic id — the aggregate
  // returned 0 and the first live receipt wiped on-hand to ~0 and reset WAC to the receipt price.
  // Reservations/stock-out handlers were already fixed to resolve the real record; this is the same
  // class of id-scheme bug in the projection rebuild.
  const movements = await tx.stockMovementRecord.aggregate({
    where: { businessId, variantId, warehouseId },
    _sum: { quantityValue: true }
  });

  const onHand = movements._sum.quantityValue || 0;

  // Resolve the REAL inventory record id so reservations (keyed by inventoryId FK) aggregate
  // correctly for seeded records too.
  const rec = await tx.inventoryRecord.findUnique({
    where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } },
    select: { id: true }
  });
  const inventoryId = rec?.id ?? `${businessId}-${variantId}-${warehouseId}`;

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
        actorId: session.user.id,
      }
    });

    await updateVariantProjection(tx, currentBusinessId, tenantId, variantId, warehouseId);
  });

  revalidatePath("/inventory");
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
        actorId: session.user.id,
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
        actorId: session.user.id,
        correlationId,
      }
    });

    await updateVariantProjection(tx, currentBusinessId, tenantId, variantId, sourceWarehouseId);
    await updateVariantProjection(tx, currentBusinessId, tenantId, variantId, targetWarehouseId);
  });

  revalidatePath("/inventory");
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

    // ---- PROC-3: validate receivability + quantities BEFORE any write (all inside this tx) ----
    const po = gr.purchaseOrder;
    if (!po || po.businessId !== currentBusinessId) throw new Error("Purchase order not found for this business");
    // No controlled over-receipt tolerance exists in the domain; a PO is receivable only while it is
    // approved/ordered/partially received. DRAFT, RECEIVED (fully), CLOSED and CANCELLED are rejected.
    const RECEIVABLE_PO_STATUS = ["APPROVED", "ORDERED", "PARTIALLY_RECEIVED"];
    if (!RECEIVABLE_PO_STATUS.includes(po.status)) throw new Error(`Cannot receive against a ${po.status} purchase order`);

    // Lock the PO's lines for the duration of this transaction so two concurrent receipts on the same
    // PO cannot each read the same remaining quantity and jointly over-receive.
    await tx.$queryRawUnsafe('SELECT 1 FROM "purchase_order_lines" WHERE "poId" = $1 FOR UPDATE', po.id);
    const poLines = await tx.purchaseOrderLine.findMany({ where: { poId: po.id } });
    const poLineById = new Map<string, any>(poLines.map((l: any) => [l.id, l]));

    // Per-line quantity validation + accumulate accepted per PO line (multi-line-per-variant safe).
    const acceptedByPoLine = new Map<string, number>();
    for (const inputLine of acceptedLines) {
      const line = gr.lines.find((l: any) => l.id === inputLine.id);
      if (!line) throw new Error(`Goods receipt line ${inputLine.id} not found on this request`);
      const acc = inputLine.acceptedQty, rej = inputLine.rejectedQty;
      if (!Number.isFinite(acc) || !Number.isFinite(rej)) throw new Error("Quantities must be numbers");
      if (acc < 0 || rej < 0) throw new Error("Accepted/rejected quantities cannot be negative");
      if (acc + rej > line.requestedQty + 1e-9) throw new Error(`Accepted + rejected (${acc + rej}) exceeds requested quantity (${line.requestedQty})`);
      if (line.poLineId) {
        if (!poLineById.has(line.poLineId)) throw new Error("Goods receipt line references a purchase-order line that no longer exists");
        acceptedByPoLine.set(line.poLineId, (acceptedByPoLine.get(line.poLineId) ?? 0) + acc);
      }
    }
    for (const [poLineId, acc] of acceptedByPoLine) {
      const pl = poLineById.get(poLineId);
      const remaining = pl.quantity - pl.receivedQty;
      if (acc > remaining + 1e-9) throw new Error(`Accepted ${acc} exceeds remaining PO quantity ${remaining} (over-receipt is not permitted)`);
    }

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
            actorId: session.user.id,
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
        updatedBy: session.user.id,
      }
    });

    if (totalAccepted > 0) {
      // Enrich the accepted lines with poLineId + variantId from the GR lines — the
      // GoodsReceiptCompleted handler needs them to update PO lines, compute WAC and create the
      // supplier bill. Emitting the raw input (id/acceptedQty/rejectedQty only) made all of that
      // silently skip (the same class of payload-mismatch bug fixed in Sales).
      const enrichedLines = acceptedLines
        .map((il) => {
          const grLine = gr.lines.find((l: { id: string; poLineId: string; variantId: string }) => l.id === il.id);
          return { id: il.id, acceptedQty: il.acceptedQty, rejectedQty: il.rejectedQty, poLineId: grLine?.poLineId, variantId: grLine?.variantId };
        })
        .filter((l) => l.acceptedQty > 0 && l.poLineId && l.variantId);

      await tx.outboxEventRecord.create({
        data: {
          eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          eventType: "GoodsReceiptCompleted",
          aggregateId: gr.id,
          aggregateVersion: 1,
          businessId: currentBusinessId,
          tenantId: tenantId,
          occurredAt: new Date(),
          payload: { poId: gr.poId, grId: gr.id, acceptedLines: enrichedLines },
          status: "PENDING"
        }
      });
    }
  });

  revalidatePath("/operations/procurement/receipts");
  revalidatePath("/inventory");
  await processOutboxBatch();
  return { success: true };
}
