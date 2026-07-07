// @ts-nocheck
"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { processOutboxBatch } from "@/lib/outbox";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { POStatus } from "@prisma/client";

export async function createPurchaseOrder(formData: FormData) {
  const { currentBusinessId, session } = await requireBusinessContext();
  await requirePermission("purchase_order.create");

  const supplierId = formData.get("supplierId") as string;
  const expectedAtStr = formData.get("expectedAt") as string;
  // Simplified for MVP, we might require selecting a currency
  const currency = await db.currency.findFirst({ where: { businessId: currentBusinessId } });

  const linesJson = formData.get("lines") as string;
  const lines: { variantId: string, quantity: number, unitPrice: number }[] = linesJson ? JSON.parse(linesJson) : [];

  if (!supplierId || lines.length === 0 || !currency) {
    throw new Error("Missing required fields or currency not configured");
  }

  let totalAmount = 0;
  const poLinesData = lines.map(line => {
    const totalPrice = line.quantity * line.unitPrice;
    totalAmount += totalPrice;
    return {
      variantId: line.variantId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      totalPrice,
    };
  });

  const count = await db.purchaseOrder.count({ where: { businessId: currentBusinessId } });
  const code = `PO-${String(count + 1).padStart(5, '0')}`;

  const po = await db.purchaseOrder.create({
    data: {
      businessId: currentBusinessId,
      code,
      supplierId,
      currencyId: currency.id,
      totalAmount,
      status: "DRAFT",
      expectedAt: expectedAtStr ? new Date(expectedAtStr) : null,
      createdBy: session.userId,
      updatedBy: session.userId,
      lines: {
        create: poLinesData
      }
    }
  });

  revalidatePath("/dashboard/procurement/orders");
  await processOutboxBatch();
  redirect(`/dashboard/procurement/orders/${po.id}`);
}

export async function updatePurchaseOrderStatus(id: string, status: POStatus) {
  const { currentBusinessId, session } = await requireBusinessContext();
  
  if (status === "APPROVED") {
    // Insert into Outbox
    await db.outboxEventRecord.create({
      data: {
        eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        eventType: "PurchaseOrderApproved",
        aggregateId: id,
        aggregateVersion: 1,
        businessId: currentBusinessId,
        tenantId: session.tenantId || "SYSTEM",
        occurredAt: new Date(),
        payload: { poId: id, status: "APPROVED" },
        status: "PENDING"
      }
    });

    await requirePermission("purchase_order.approve");
  } else {
    await requirePermission("purchase_order.update");
  }

  const po = await db.purchaseOrder.findUnique({ where: { id, businessId: currentBusinessId } });
  if (!po) throw new Error("PO not found");

  const updateData: any = {
    status,
    updatedBy: session.userId,
  };

  if (status === "APPROVED") {
    updateData.approvedBy = session.userId;
    updateData.approvedAt = new Date();
  }

  if (status === "ORDERED" && po.status !== "ORDERED") {
    updateData.orderedAt = new Date();
    // In future: emit PurchaseOrderOrdered integration event
  }

  await db.purchaseOrder.update({
    where: { id },
    data: updateData
  });

  revalidatePath(`/dashboard/procurement/orders/${id}`);
  revalidatePath("/dashboard/procurement/orders");
  await processOutboxBatch();
  return { success: true };
}
