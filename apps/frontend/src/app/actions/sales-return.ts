"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

async function getBusinessId() {
  const { getActiveBusinessId } = await import("@/lib/server-auth");
  return getActiveBusinessId();
}

async function generateSalesReturnCode(businessId: string): Promise<string> {
  const count = await db.salesReturn.count({ where: { businessId } });
  return `SR-${String(count + 1).padStart(5, "0")}`;
}

export async function requestSalesReturn(data: {
  soId: string;
  warehouseId: string; // The warehouse where the items will be returned
  lines: { soLineId: string; variantId: string; quantity: number; reason: string }[];
}) {
  const businessId = await getBusinessId();
  const order = await db.salesOrder.findUnique({
    where: { id: data.soId, businessId }
  });

  if (!order) throw new Error("Sales order not found");
  
  const code = await generateSalesReturnCode(businessId);

  const salesReturn = await db.salesReturn.create({
    data: {
      businessId,
      code,
      customerId: order.customerId,
      soId: order.id,
      warehouseId: data.warehouseId,
      status: "REQUESTED",
      lines: {
        create: data.lines.map(l => ({
          soLineId: l.soLineId,
          variantId: l.variantId,
          quantity: l.quantity,
          reason: l.reason
        }))
      }
    }
  });

  // Event: SalesReturnRequested
  const tenantMembership = await db.membership.findFirst({
    where: { businessId },
    include: { business: true }
  });
  const tenantId = tenantMembership?.business.tenantId || "UNKNOWN";

  await db.outboxEventRecord.create({
    data: {
      eventId: uuidv4(),
      eventType: "SalesReturnRequested",
      aggregateId: salesReturn.id,
      aggregateVersion: 1,
      businessId,
      tenantId,
      occurredAt: new Date(),
      payload: JSON.stringify({
        returnId: salesReturn.id,
        warehouseId: data.warehouseId,
        lines: data.lines
      }),
      status: "PENDING"
    }
  });

  revalidatePath("/sales/returns");
  return salesReturn;
}

export async function approveSalesReturn(id: string) {
  const businessId = await getBusinessId();
  const salesReturn = await db.salesReturn.update({
    where: { id, businessId },
    data: { status: "APPROVED" }
  });
  revalidatePath("/sales/returns");
  return salesReturn;
}

export async function receiveSalesReturn(id: string) {
  // In reality, this would be an event coming back from INVENTORY saying "InventoryReturnAccepted"
  // For V1 MVP without full background worker, we simulate the manual step here.
  const businessId = await getBusinessId();
  const salesReturn = await db.salesReturn.update({
    where: { id, businessId },
    data: { status: "RECEIVED" }
  });
  revalidatePath("/sales/returns");
  return salesReturn;
}

export async function getSalesReturns() {
  const businessId = await getBusinessId();
  return db.salesReturn.findMany({
    where: { businessId },
    include: {
      customer: true,
      salesOrder: true,
      lines: {
        include: { variant: { include: { product: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}
