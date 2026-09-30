"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { logAudit } from "@/lib/audit";
import { processOutboxBatch } from "@/lib/outbox";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createShipment(formData: FormData) {
  const { currentBusinessId, session, tenantId } = await requireBusinessContext();
  await requirePermission("fulfillment.create");

  const soId = formData.get("soId") as string;
  const warehouseId = formData.get("warehouseId") as string;

  const so = await db.salesOrder.findUnique({
    where: { id: soId, businessId: currentBusinessId },
    include: { lines: true }
  });

  if (!so) throw new Error("Sales Order not found");
  // SALES-8: a shipment may only be created for a confirmed (stock-reserved) order. This does not
  // change WHERE stock leaves inventory — that still happens at DISPATCH (ShipmentDispatched ->
  // InventoryStockOutRequested) — it only gates shipment CREATION on order eligibility.
  if (so.status !== "CONFIRMED" && so.status !== "PARTIALLY_FULFILLED") {
    throw new Error("Sales order must be confirmed before a shipment can be created");
  }

  const count = await db.shipment.count({ where: { businessId: currentBusinessId } });
  const code = `SHP-${String(count + 1).padStart(5, "0")}`;

  const shipment = await db.shipment.create({
    data: {
      businessId: currentBusinessId,
      code,
      soId,
      warehouseId,
      status: "DRAFT",
      createdBy: session.user.id,
      updatedBy: session.user.id,
      lines: {
        create: so.lines.map(line => ({
          soLineId: line.id,
          variantId: line.variantId,
          requestedQty: line.quantity,
          pickedQty: 0,
          packedQty: 0,
          shippedQty: 0
        }))
      }
    }
  });

  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: "ShipmentCreated",
      aggregateId: shipment.id,
      aggregateVersion: 1,
      businessId: currentBusinessId,
      tenantId: tenantId || "SYSTEM",
      occurredAt: new Date(),
      payload: { shipmentId: shipment.id, soId },
      status: "PENDING"
    }
  });

  await logAudit({ action: "create", resource: "shipment", resourceId: shipment.id, metadata: { code, soId } });
  revalidatePath("/sales/deliveries");
  await processOutboxBatch();
  redirect(`/sales/deliveries/${shipment.id}`);
}

// Legal shipment transitions (from the delivery UI + the logistics LOADED state). Targets are limited
// to what this action can set; DELIVERED/CANCELLED are terminal. This is what stops an arbitrary jump
// such as DRAFT -> DISPATCHED (which would stock-out/invoice/COGS without pick/pack).
const LEGAL_SHIPMENT_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PICKING", "CANCELLED"],
  PICKING: ["PACKING", "CANCELLED"],
  PACKING: ["READY_TO_DISPATCH", "DISPATCHED", "CANCELLED"],
  READY_TO_DISPATCH: ["DISPATCHED", "CANCELLED"],
  LOADED: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["DELIVERED"],
  PARTIALLY_DELIVERED: ["DELIVERED"],
};

export async function updateShipmentStatus(
  id: string,
  status: "PICKING" | "PACKING" | "READY_TO_DISPATCH" | "DISPATCHED" | "DELIVERED" | "CANCELLED",
  linesData?: { id: string; pickedQty?: number; packedQty?: number; shippedQty?: number }[],
) {
  const { currentBusinessId, session, tenantId } = await requireBusinessContext();
  await requirePermission("fulfillment.update");

  const shipment = await db.shipment.findUnique({
    where: { id, businessId: currentBusinessId },
    include: { lines: true }
  });

  if (!shipment) throw new Error("Shipment not found");

  // SALES-6: validate the transition server-side so arbitrary status jumps cannot bypass the
  // pick/pack/dispatch/deliver lifecycle even after createShipment eligibility (SALES-8) was added.
  const allowed = LEGAL_SHIPMENT_TRANSITIONS[shipment.status] ?? [];
  if (!allowed.includes(status)) {
    throw new Error(`Illegal shipment transition: ${shipment.status} -> ${status}`);
  }

  await db.$transaction(async (tx) => {
    // Concurrency-safe transition claim: advance only if still in the validated source status, so two
    // concurrent updates (e.g. two dispatches) cannot both proceed.
    const res = await tx.shipment.updateMany({
      where: { id, businessId: currentBusinessId, status: shipment.status },
      data: { status, updatedBy: session.user.id },
    });
    if (res.count === 0) throw new Error("Shipment status changed concurrently");

    // Update lines if provided — scoped to THIS shipment so a client-supplied line id cannot touch
    // another shipment's line.
    if (linesData && linesData.length > 0) {
      for (const ld of linesData) {
        await tx.shipmentLine.updateMany({
          where: { id: ld.id, shipmentId: id },
          data: {
            pickedQty: ld.pickedQty !== undefined ? ld.pickedQty : undefined,
            packedQty: ld.packedQty !== undefined ? ld.packedQty : undefined,
            shippedQty: ld.shippedQty !== undefined ? ld.shippedQty : undefined,
          }
        });
      }
    }

    if (status === "DISPATCHED") {
      // Create Delivery Note
      await tx.deliveryNote.create({
        data: {
          shipmentId: id,
          code: `DN-${shipment.code.split("-")[1]}`
        }
      });

      // Emit ShipmentDispatched (Triggers Inventory Stock Out)
      const updatedLines = await tx.shipmentLine.findMany({ where: { shipmentId: id } });
      
      await tx.outboxEventRecord.create({
        data: {
          eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          eventType: "ShipmentDispatched",
          aggregateId: id,
          aggregateVersion: 1,
          businessId: currentBusinessId,
          tenantId: tenantId || "SYSTEM",
          occurredAt: new Date(),
          payload: {
            soId: shipment.soId,
            shipmentId: id,
            warehouseId: shipment.warehouseId,
            lines: updatedLines
          },
          status: "PENDING"
        }
      });
    }

    if (status === "DELIVERED") {
      await tx.outboxEventRecord.create({
        data: {
          eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          eventType: "ShipmentDelivered",
          aggregateId: id,
          aggregateVersion: 1,
          businessId: currentBusinessId,
          tenantId: tenantId || "SYSTEM",
          occurredAt: new Date(),
          payload: { shipmentId: id, soId: shipment.soId },
          status: "PENDING"
        }
      });
    }
  });

  await logAudit({ action: status.toLowerCase(), resource: "shipment", resourceId: id, metadata: { code: shipment.code, status } });
  revalidatePath(`/sales/deliveries/${id}`);
  revalidatePath("/sales/deliveries");
  await processOutboxBatch();
  return { success: true };
}

/** List shipments for the active business (for the Deliveries list). */
export async function getShipments() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");
  return db.shipment.findMany({
    where: { businessId, deletedAt: null },
    include: {
      salesOrder: { include: { customer: { select: { name: true } } } },
      warehouse: { select: { name: true, code: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Full shipment detail (lines + SO + warehouse + delivery note) for the Deliveries detail page. */
export async function getShipmentById(id: string) {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");
  return db.shipment.findFirst({
    where: { id, businessId },
    include: {
      salesOrder: { include: { customer: true, lines: true } },
      warehouse: true,
      lines: { include: { variant: { include: { product: true } } } },
      deliveryNote: true,
    },
  });
}
