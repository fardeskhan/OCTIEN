"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { logAudit } from "@/lib/audit";
import { drainOutbox } from "@/lib/outbox";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

async function generateSalesOrderCode(businessId: string): Promise<string> {
  const count = await db.salesOrder.count({ where: { businessId } });
  return `SO-${String(count + 1).padStart(5, "0")}`;
}

export async function createSalesOrderFromQuote(quoteId: string) {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.write");

  const quote = await db.quotation.findFirst({
    where: { id: quoteId, businessId },
    include: { lines: true }
  });

  if (!quote) throw new Error("Quote not found");
  if (quote.status !== "ACCEPTED") throw new Error("Quote must be ACCEPTED before converting to an order");

  const code = await generateSalesOrderCode(businessId);

  const order = await db.salesOrder.create({
    data: {
      businessId,
      code,
      customerId: quote.customerId,
      totalAmount: quote.totalAmount,
      currencyId: quote.currencyId,
      status: "DRAFT",
      lines: {
        create: quote.lines.map(line => ({
          variantId: line.variantId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          totalPrice: line.totalPrice
        }))
      }
    }
  });

  await logAudit({ action: "create", resource: "sales_order", resourceId: order.id, metadata: { code, fromQuote: quote.code } });
  revalidatePath("/sales/orders");
  revalidatePath("/sales/quotations");
  return order;
}

export async function approveSalesOrder(id: string) {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.write");

  const existing = await db.salesOrder.findFirst({ where: { id, businessId } });
  if (!existing) throw new Error("Order not found");
  if (existing.status !== "DRAFT") throw new Error("Only a DRAFT order can be approved");

  // Atomic conditional transition (concurrency-safe): succeeds only if the order is still DRAFT.
  const res = await db.salesOrder.updateMany({ where: { id, businessId, status: "DRAFT" }, data: { status: "APPROVED" } });
  if (res.count === 0) throw new Error("Order is no longer in DRAFT state");

  await logAudit({ action: "approve", resource: "sales_order", resourceId: existing.id, metadata: { code: existing.code } });
  revalidatePath("/sales/orders");
  revalidatePath(`/sales/orders/${id}`);
  return { ...existing, status: "APPROVED" };
}

export async function confirmSalesOrder(id: string) {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.write");

  const order = await db.salesOrder.findFirst({
    where: { id, businessId },
    include: { lines: true }
  });

  if (!order) throw new Error("Order not found");
  if (order.status !== "APPROVED") throw new Error("Only an APPROVED order can be confirmed");

  const tenantMembership = await db.membership.findFirst({
    where: { businessId },
    include: { business: true }
  });
  const tenantId = tenantMembership?.business.tenantId || "UNKNOWN";

  // Atomic: the APPROVED->CONFIRMED transition and the SalesOrderConfirmed event commit together, so
  // a CONFIRMED order always carries its reservation event (no CONFIRMED-without-event on failure).
  // The conditional updateMany keeps it concurrency/replay safe (only one of two concurrent confirms
  // matches APPROVED).
  await db.$transaction(async (tx) => {
    const res = await tx.salesOrder.updateMany({ where: { id, businessId, status: "APPROVED" }, data: { status: "CONFIRMED" } });
    if (res.count === 0) throw new Error("Order is no longer in APPROVED state");

    await tx.outboxEventRecord.create({
      data: {
        eventId: uuidv4(),
        eventType: "SalesOrderConfirmed",
        aggregateId: order.id,
        aggregateVersion: 1,
        businessId,
        tenantId,
        occurredAt: new Date(),
        // Plain object into the Json column (NOT JSON.stringify). Keys match the handler: soId +
        // line id (see lib/outbox/handlers.ts SalesOrderConfirmed -> reserve).
        payload: {
          soId: order.id,
          lines: order.lines.map(l => ({ variantId: l.variantId, quantity: l.quantity, id: l.id }))
        },
        status: "PENDING"
      }
    });
  });

  // Drain OUTSIDE the transaction — outbox processing is independently idempotent (the two-hop chain
  // SalesOrderConfirmed -> InventoryReservationRequested -> reservation).
  await drainOutbox();

  await logAudit({ action: "confirm", resource: "sales_order", resourceId: order.id, metadata: { code: order.code } });
  revalidatePath("/sales/orders");
  revalidatePath(`/sales/orders/${id}`);
  revalidatePath("/inventory");
  return order;
}

export async function fulfillSalesOrder(id: string) {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.write");

  const order = await db.salesOrder.findFirst({
    where: { id, businessId },
    include: { lines: true }
  });

  if (!order) throw new Error("Order not found");
  if (order.status !== "CONFIRMED" && order.status !== "PARTIALLY_FULFILLED") {
    throw new Error("Only a confirmed order can be fulfilled");
  }

  const tenantMembership = await db.membership.findFirst({
    where: { businessId },
    include: { business: true }
  });
  const tenantId = tenantMembership?.business.tenantId || "UNKNOWN";

  // Atomic: the transition to FULFILLED and the SalesOrderFulfilled event commit together. The
  // conditional updateMany keeps it concurrency/replay safe.
  await db.$transaction(async (tx) => {
    const res = await tx.salesOrder.updateMany({ where: { id, businessId, status: { in: ["CONFIRMED", "PARTIALLY_FULFILLED"] } }, data: { status: "FULFILLED" } });
    if (res.count === 0) throw new Error("Order is not in a fulfillable state");

    await tx.outboxEventRecord.create({
      data: {
        eventId: uuidv4(),
        eventType: "SalesOrderFulfilled",
        aggregateId: order.id,
        aggregateVersion: 1,
        businessId,
        tenantId,
        occurredAt: new Date(),
        // Plain object into the Json column (see confirm note above).
        payload: {
          soId: order.id,
          lines: order.lines.map(l => ({
            variantId: l.variantId,
            quantity: l.quantity, // Assume full fulfillment for V1 MVP
            id: l.id
          }))
        },
        status: "PENDING"
      }
    });
  });

  // Drain OUTSIDE the transaction (independently idempotent).
  await drainOutbox();

  await logAudit({ action: "fulfill", resource: "sales_order", resourceId: order.id, metadata: { code: order.code } });
  revalidatePath("/sales/orders");
  revalidatePath(`/sales/orders/${id}`);
  revalidatePath("/inventory");
  return order;
}

/** Cancel an order and release any inventory it had reserved (reverse of the reservation flow). */
export async function cancelSalesOrder(id: string) {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.write");

  const order = await db.salesOrder.findFirst({ where: { id, businessId }, include: { lines: true } });
  if (!order) throw new Error("Order not found");
  if (order.status === "FULFILLED") throw new Error("A fulfilled order cannot be cancelled");
  if (order.status === "CANCELLED") throw new Error("Order is already cancelled");

  const reservedLines = order.lines.filter((l) => l.reservedQty > 0);
  const warehouse = reservedLines.length > 0 ? await db.warehouse.findFirst({ where: { businessId, isDefault: true } }) : null;

  // Atomic: claim the cancellation AND release every reservation (projection reserved-/available+,
  // line reservedQty=0, reservation records deleted) as ONE unit. A mid-release failure rolls the
  // whole thing back — no half-released, half-cancelled order. The conditional cancel is done first
  // so a concurrent fulfill/deliver that already advanced the order aborts before anything is
  // released (count 0 -> throw -> rollback).
  await db.$transaction(async (tx) => {
    const cancelRes = await tx.salesOrder.updateMany({
      where: { id, businessId, status: { in: ["DRAFT", "APPROVED", "CONFIRMED", "PARTIALLY_FULFILLED"] } },
      data: { status: "CANCELLED" },
    });
    if (cancelRes.count === 0) throw new Error("Order can no longer be cancelled");

    if (reservedLines.length > 0 && warehouse) {
      for (const line of reservedLines) {
        const key = { businessId_variantId_warehouseId: { businessId, variantId: line.variantId, warehouseId: warehouse.id } };
        const proj = await tx.inventoryVariantProjection.findUnique({ where: key });
        if (proj) {
          await tx.inventoryVariantProjection.update({
            where: key,
            data: {
              reservedQuantity: Math.max(0, proj.reservedQuantity - line.reservedQty),
              availableQuantity: proj.availableQuantity + line.reservedQty,
            },
          });
        }
        await tx.salesOrderLine.update({ where: { id: line.id }, data: { reservedQty: 0 } });
      }
      await tx.reservationRecord.deleteMany({ where: { businessId, referenceId: order.id } });
    }
  });

  await logAudit({
    action: "cancel",
    resource: "sales_order",
    resourceId: order.id,
    metadata: { code: order.code, releasedLines: reservedLines.length },
  });
  revalidatePath("/sales/orders");
  revalidatePath(`/sales/orders/${id}`);
  revalidatePath("/inventory");
  return { success: true } as const;
}

export async function getSalesOrderById(id: string) {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");
  return db.salesOrder.findFirst({
    where: { id, businessId },
    include: {
      customer: true,
      currency: true,
      lines: { include: { variant: { include: { product: true } } } },
    },
  });
}

export async function getSalesOrders() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");
  return db.salesOrder.findMany({
    where: { businessId },
    include: {
      customer: true,
      lines: {
        include: { variant: { include: { product: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}
