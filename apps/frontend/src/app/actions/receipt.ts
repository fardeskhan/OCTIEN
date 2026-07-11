"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { processOutboxBatch } from "@/lib/outbox";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createGoodsReceiptRequest(formData: FormData) {
  const { currentBusinessId, session, tenantId } = await requireBusinessContext();
  await requirePermission("purchase_order.update"); // Procurement initiates GR

  const poId = formData.get("poId") as string;
  const warehouseId = formData.get("warehouseId") as string;

  const linesJson = formData.get("lines") as string;
  const lines: { poLineId: string, variantId: string, requestedQty: number }[] = linesJson ? JSON.parse(linesJson) : [];

  if (!poId || !warehouseId || lines.length === 0) {
    throw new Error("Missing required fields");
  }

  const count = await db.goodsReceiptRequest.count({ where: { businessId: currentBusinessId } });
  const code = `GR-${String(count + 1).padStart(5, '0')}`;

  const gr = await db.goodsReceiptRequest.create({
    data: {
      businessId: currentBusinessId,
      code,
      poId,
      warehouseId,
      status: "REQUESTED",
      createdBy: session.user.id,
      updatedBy: session.user.id,
      lines: {
        create: lines.map(line => ({
          poLineId: line.poLineId,
          variantId: line.variantId,
          requestedQty: line.requestedQty,
        }))
      }
    }
  });

  // Emit outbox event
  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: "GoodsReceiptRequested",
      aggregateId: gr.id,
      aggregateVersion: 1,
      businessId: currentBusinessId,
      tenantId: tenantId || "SYSTEM",
      occurredAt: new Date(),
      payload: { grId: gr.id, poId },
      status: "PENDING"
    }
  });
  // In a real CQRS setup, we would insert into an outbox table here.
  // Instead of updating inventory here (which is FORBIDDEN), this GR request
  // signals the Inventory app to create a physical receiving task.

  revalidatePath("/operations/procurement/receipts");
  await processOutboxBatch();
  redirect(`/operations/procurement/receipts/${gr.id}`);
}
