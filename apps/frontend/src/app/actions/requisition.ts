// @ts-nocheck
"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission, requireRole } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PRStatus } from "@prisma/client";

export async function createPurchaseRequisition(formData: FormData) {
  const { currentBusinessId, session } = await requireBusinessContext();
  await requirePermission("purchase_requisition.create");

  const department = formData.get("department") as string;
  const justification = formData.get("justification") as string;
  
  // Extract lines
  const linesJson = formData.get("lines") as string;
  const lines: { variantId: string, quantity: number, estimatedCost: number }[] = linesJson ? JSON.parse(linesJson) : [];

  if (lines.length === 0) throw new Error("Requisition must have at least one line item");

  const count = await db.purchaseRequisition.count({ where: { businessId: currentBusinessId } });
  const code = `PR-${String(count + 1).padStart(5, '0')}`;

  const pr = await db.purchaseRequisition.create({
    data: {
      businessId: currentBusinessId,
      code,
      status: "DRAFT",
      requesterId: session.userId,
      department,
      justification,
      createdBy: session.userId,
      updatedBy: session.userId,
      lines: {
        create: lines.map(line => ({
          variantId: line.variantId,
          quantity: line.quantity,
          estimatedCost: line.estimatedCost
        }))
      }
    }
  });

  revalidatePath("/dashboard/procurement/requisitions");
  redirect(`/dashboard/procurement/requisitions/${pr.id}`);
}

export async function updateRequisitionStatus(id: string, status: PRStatus) {
  const { currentBusinessId, session } = await requireBusinessContext();
  
  if (status === "APPROVED" || status === "REJECTED") {
    // Only approvers can approve/reject
    await requirePermission("purchase_requisition.approve");
  } else {
    await requirePermission("purchase_requisition.update");
  }

  const pr = await db.purchaseRequisition.findUnique({ where: { id, businessId: currentBusinessId } });
  if (!pr) throw new Error("PR not found");

  await db.purchaseRequisition.update({
    where: { id },
    data: {
      status,
      updatedBy: session.userId,
    }
  });

  revalidatePath(`/dashboard/procurement/requisitions/${id}`);
  revalidatePath("/dashboard/procurement/requisitions");
  return { success: true };
}
