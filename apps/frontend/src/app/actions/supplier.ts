// @ts-nocheck
"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SupplierStatus, SupplierRiskLevel } from "@prisma/client";

export async function createSupplier(formData: FormData) {
  const { currentBusinessId, session } = await requireBusinessContext();
  await requirePermission("supplier.create");

  const name = formData.get("name") as string;
  const status = formData.get("status") as SupplierStatus;
  const riskLevel = formData.get("riskLevel") as SupplierRiskLevel;
  const paymentTerms = formData.get("paymentTerms") as string;

  if (!name) throw new Error("Name is required");

  // Auto generate supplier code: SUP-XXXXX
  const count = await db.supplier.count({ where: { businessId: currentBusinessId } });
  const code = `SUP-${String(count + 1).padStart(5, '0')}`;

  const supplier = await db.supplier.create({
    data: {
      businessId: currentBusinessId,
      name,
      code,
      status: status || "PROSPECT",
      riskLevel: riskLevel || "LOW",
      paymentTerms,
      createdBy: session.userId,
      updatedBy: session.userId,
    }
  });

  revalidatePath("/dashboard/procurement/suppliers");
  redirect(`/dashboard/procurement/suppliers/${supplier.id}`);
}

export async function addSupplierContact(formData: FormData) {
  const { currentBusinessId } = await requireBusinessContext();
  await requirePermission("supplier.update");

  const supplierId = formData.get("supplierId") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const isPrimary = formData.get("isPrimary") === "on";

  if (!name || !supplierId) throw new Error("Missing required fields");

  // Basic security check to ensure this supplier belongs to the current business
  const supplier = await db.supplier.findUnique({ where: { id: supplierId, businessId: currentBusinessId } });
  if (!supplier) throw new Error("Supplier not found");

  if (isPrimary) {
    await db.supplierContact.updateMany({
      where: { supplierId },
      data: { isPrimary: false }
    });
  }

  await db.supplierContact.create({
    data: {
      supplierId,
      name,
      email,
      phone,
      isPrimary
    }
  });

  revalidatePath(`/dashboard/procurement/suppliers/${supplierId}`);
  return { success: true };
}
