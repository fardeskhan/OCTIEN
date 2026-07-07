// @ts-nocheck
"use server";

import { db } from "@/lib/db";
import { withActiveRecords } from "@/lib/db-helpers";
import { cookies } from "next/headers";
import { processOutboxBatch } from "@/lib/outbox";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

function getBusinessId() {
  const cookieStore = cookies();
  const businessId = cookieStore.get("current_business_id")?.value;
  if (!businessId) throw new Error("No business context selected");
  return businessId;
}

async function generateSalesOrderCode(businessId: string): Promise<string> {
  const count = await db.salesOrder.count({ where: withActiveRecords({ businessId }) });
  return `SO-${String(count + 1).padStart(5, "0")}`;
}

export async function createSalesOrderFromQuote(quoteId: string) {
  const businessId = getBusinessId();
  const quote = await db.quotation.findUnique({
    where: { id: quoteId, businessId },
    include: { lines: true }
  });

  if (!quote) throw new Error("Quote not found");
  if (quote.status !== "ACCEPTED") throw new Error("Quote must be ACCEPTED");

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

  revalidatePath("/dashboard/sales/orders");
  return order;
}

export async function approveSalesOrder(id: string) {
  const businessId = getBusinessId();
  const order = await db.salesOrder.update({
    where: withActiveRecords({ id, businessId }),
    data: { status: "APPROVED" }
  });
  revalidatePath("/dashboard/sales/orders");
  return order;
}

export async function confirmSalesOrder(id: string) {
  const businessId = getBusinessId();
  // Ensure order is APPROVED or DRAFT (depending on strictness)
  const order = await db.salesOrder.findUnique({
    where: withActiveRecords({ id, businessId }),
    include: { lines: true }
  });

  if (!order) throw new Error("Order not found");

  await db.salesOrder.update({
    where: withActiveRecords({ id, businessId }),
    data: { status: "CONFIRMED" }
  });

  // Outbox event to trigger inventory reservation
  const tenantMembership = await db.membership.findFirst({
    where: withActiveRecords({ businessId }),
    include: { business: true }
  });
  const tenantId = tenantMembership?.business.tenantId || "UNKNOWN";

  await db.outboxEventRecord.create({
    data: {
      eventId: uuidv4(),
      eventType: "SalesOrderConfirmed",
      aggregateId: order.id,
      aggregateVersion: 1,
      businessId,
      tenantId,
      occurredAt: new Date(),
      payload: JSON.stringify({
        orderId: order.id,
        lines: order.lines.map(l => ({
          variantId: l.variantId,
          quantity: l.quantity,
          lineId: l.id
        }))
      }),
      status: "PENDING"
    }
  });

  revalidatePath("/dashboard/sales/orders");
  revalidatePath(`/dashboard/sales/orders/${id}`);
  return order;
}

export async function fulfillSalesOrder(id: string) {
  const businessId = getBusinessId();
  const order = await db.salesOrder.findUnique({
    where: withActiveRecords({ id, businessId }),
    include: { lines: true }
  });

  if (!order) throw new Error("Order not found");

  await db.salesOrder.update({
    where: withActiveRecords({ id, businessId }),
    data: { status: "FULFILLED" }
  });

  // Outbox event for fulfillment
  const tenantMembership = await db.membership.findFirst({
    where: withActiveRecords({ businessId }),
    include: { business: true }
  });
  const tenantId = tenantMembership?.business.tenantId || "UNKNOWN";

  await db.outboxEventRecord.create({
    data: {
      eventId: uuidv4(),
      eventType: "SalesOrderFulfilled",
      aggregateId: order.id,
      aggregateVersion: 1,
      businessId,
      tenantId,
      occurredAt: new Date(),
      payload: JSON.stringify({
        orderId: order.id,
        lines: order.lines.map(l => ({
          variantId: l.variantId,
          quantity: l.quantity, // Assume full fulfillment for V1 MVP
          lineId: l.id
        }))
      }),
      status: "PENDING"
    }
  });

  revalidatePath("/dashboard/sales/orders");
  return order;
}

export async function getSalesOrders() {
  const businessId = getBusinessId();
  return db.salesOrder.findMany({
    where: withActiveRecords({ businessId }),
    include: {
      customer: true,
      lines: {
        include: { variant: { include: { product: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}
