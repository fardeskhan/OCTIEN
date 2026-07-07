// @ts-nocheck
"use server";

import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/rbac";
import { processOutboxBatch } from "@/lib/outbox";
import { EWayBillGenerationSource } from "@prisma/client";

export async function createTransporter(data: { name: string; code: string; gstin?: string; contactName?: string; phone?: string }) {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "logistics.write");

  return db.transporter.create({
    data: {
      businessId,
      ...data
    }
  });
}

export async function createVehicle(data: { transporterId: string; registration: string; type?: string; capacityKg?: number; capacityCases?: number; capacityVolume?: number }) {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "logistics.write");

  return db.vehicle.create({
    data: {
      businessId,
      ...data
    }
  });
}

export async function createDriver(data: { name: string; phone?: string; licenseNumber?: string; isExternal?: boolean; transporterId?: string; identityType?: string; identityReference?: string }) {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "logistics.write");

  return db.driver.create({
    data: {
      businessId,
      ...data
    }
  });
}

export async function createDeliveryRun(data: { code: string; transporterId: string; vehicleId: string; driverId?: string }) {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "logistics.write");

  return db.deliveryRun.create({
    data: {
      businessId,
      ...data
    }
  });
}

export async function createDeliveryRunStop(data: { deliveryRunId: string; stopSequence: number; locationName?: string; customerId?: string; addressLine1?: string; city?: string; state?: string; postalCode?: string }) {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "logistics.write");

  return db.deliveryRunStop.create({
    data: {
      businessId,
      ...data
    }
  });
}

export async function assignShipmentsToStop(stopId: string, shipmentIds: string[]) {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "logistics.write");

  return db.$transaction(async (tx) => {
    for (const shipmentId of shipmentIds) {
      const shipment = await tx.shipment.findUnique({ where: { id: shipmentId, businessId } });
      if (shipment && shipment.status !== "DELIVERED" && shipment.status !== "PARTIALLY_DELIVERED") {
        await tx.shipment.update({
          where: { id: shipmentId },
          data: { deliveryRunStopId: stopId, status: "LOADED" }
        });
      }
    }
    
    // Auto-update run status to LOADING
    const stop = await tx.deliveryRunStop.findUnique({ where: { id: stopId } });
    if (stop) {
        await tx.deliveryRun.update({
            where: { id: stop.deliveryRunId },
            data: { status: "LOADING" }
        });
    }
  });
}

export async function startDeliveryRun(runId: string) {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "logistics.write");

  return db.$transaction(async (tx) => {
    const run = await tx.deliveryRun.findUnique({
      where: { id: runId, businessId },
      include: { stops: { include: { shipments: true } } }
    });
    
    if (!run) throw new Error("Delivery run not found");
    if (run.status !== "SCHEDULED" && run.status !== "LOADING") throw new Error("Can only start scheduled or loading runs");

    const updatedRun = await tx.deliveryRun.update({
      where: { id: runId },
      data: {
        status: "IN_TRANSIT",
        dispatchDate: new Date()
      }
    });

    for (const stop of run.stops) {
      for (const shipment of stop.shipments) {
        if (shipment.status === "LOADED" || shipment.status === "READY_TO_DISPATCH") {
          await tx.shipment.update({
            where: { id: shipment.id },
            data: { status: "DISPATCHED" }
          });

          await tx.outboxEventRecord.create({
            data: {
              eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              eventType: "ShipmentDispatched",
              aggregateId: shipment.id,
              aggregateVersion: 1,
              businessId,
              tenantId,
              occurredAt: new Date(),
              payload: { shipmentId: shipment.id, soId: shipment.soId, warehouseId: shipment.warehouseId },
              status: "PENDING"
            }
          });
        }
      }
    }

    return updatedRun;
  }).finally(() => {
    processOutboxBatch().catch(console.error);
  });
}

export async function recordProofOfDelivery(shipmentId: string, data: { receivedBy: string; receiverPhone?: string; proofOfDeliveryUrl?: string; isPartial?: boolean }) {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "logistics.write");

  return db.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({ where: { id: shipmentId, businessId } });
    if (!shipment) throw new Error("Shipment not found");

    const newStatus = data.isPartial ? "PARTIALLY_DELIVERED" : "DELIVERED";

    const updated = await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        status: newStatus,
        receivedBy: data.receivedBy,
        receiverPhone: data.receiverPhone,
        proofOfDeliveryUrl: data.proofOfDeliveryUrl,
        receivedAt: new Date()
      }
    });

    await tx.outboxEventRecord.create({
      data: {
        eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        eventType: "ShipmentDelivered",
        aggregateId: shipment.id,
        aggregateVersion: 1,
        businessId,
        tenantId,
        occurredAt: new Date(),
        payload: { shipmentId: shipment.id, soId: shipment.soId, status: newStatus },
        status: "PENDING"
      }
    });

    return updated;
  }).finally(() => {
    processOutboxBatch().catch(console.error);
  });
}

export async function completeDeliveryRun(runId: string) {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "logistics.write");

  const run = await db.deliveryRun.findUnique({
    where: { id: runId, businessId },
  });
  if (!run || run.status !== "IN_TRANSIT") throw new Error("Can only complete in-transit runs");

  return db.deliveryRun.update({
    where: { id: runId },
    data: { status: "COMPLETED" }
  });
}

export async function recordEWayBill(data: { ewbNumber: string; invoiceId: string; shipmentId?: string; validFrom?: Date; validUntil?: Date; vehicleNumber?: string; transporterName?: string; generationSource?: EWayBillGenerationSource }) {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "logistics.write");

  return db.eWayBill.create({
    data: {
      businessId,
      ...data,
      status: "GENERATED",
      generatedBy: userId
    }
  });
}

export async function cancelEWayBill(ewbId: string, cancelReason: string) {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "logistics.write");

  return db.eWayBill.update({
    where: { id: ewbId, businessId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason
    }
  });
}
