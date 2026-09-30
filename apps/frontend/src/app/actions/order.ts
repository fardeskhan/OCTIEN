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
      createdBy: session.user.id,
      updatedBy: session.user.id,
      lines: {
        create: poLinesData
      }
    }
  });

  revalidatePath("/operations/procurement/orders");
  await processOutboxBatch();
  redirect(`/operations/procurement/orders/${po.id}`);
}

// Legal USER-driven PO transitions (only these are invoked from the UI). The receive transitions
// (-> PARTIALLY_RECEIVED / RECEIVED) are performed by the GoodsReceiptCompleted handler, NOT via this
// action, and are intentionally rejected for user calls. CANCELLED/CLOSED have no wired transition in
// the current codebase, so no transition into them is permitted here (documented lifecycle gap).
const LEGAL_PO_TRANSITIONS: Record<string, POStatus[]> = {
  DRAFT: ["APPROVED"],
  APPROVED: ["ORDERED"],
};

export async function updatePurchaseOrderStatus(id: string, status: POStatus) {
  const { currentBusinessId, session, tenantId } = await requireBusinessContext();

  // PROC-2: authorize FIRST — before any read, write or side effect.
  await requirePermission(status === "APPROVED" ? "purchase_order.approve" : "purchase_order.update");

  // Ownership check, state-machine validation, the mutation and the PurchaseOrderApproved event all
  // run in ONE transaction. No outbox event is written until authorization, ownership AND a legal
  // transition are established. The state machine also gives replay protection (re-approving an
  // already-APPROVED PO is an illegal APPROVED->APPROVED transition, so no duplicate event).
  await db.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findFirst({ where: { id, businessId: currentBusinessId } });
    if (!po) throw new Error("PO not found");

    const allowed = LEGAL_PO_TRANSITIONS[po.status] ?? [];
    if (!allowed.includes(status)) {
      throw new Error(`Illegal purchase-order transition: ${po.status} -> ${status}`);
    }

    const updateData: any = { status, updatedBy: session.user.id };
    if (status === "APPROVED") {
      updateData.approvedBy = session.user.id;
      updateData.approvedAt = new Date();
    }
    if (status === "ORDERED") {
      updateData.orderedAt = new Date();
    }

    await tx.purchaseOrder.update({ where: { id }, data: updateData });

    if (status === "APPROVED") {
      await tx.outboxEventRecord.create({
        data: {
          eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          eventType: "PurchaseOrderApproved",
          aggregateId: id,
          aggregateVersion: 1,
          businessId: currentBusinessId,
          tenantId: tenantId || "SYSTEM",
          occurredAt: new Date(),
          payload: { poId: id, status: "APPROVED" },
          status: "PENDING",
        },
      });
    }
  });

  revalidatePath(`/operations/procurement/orders/${id}`);
  revalidatePath("/operations/procurement/orders");
  await processOutboxBatch();
  return { success: true };
}
