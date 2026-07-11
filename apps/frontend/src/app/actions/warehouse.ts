"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import { WarehouseType } from "@prisma/client";

export async function createWarehouse(formData: FormData) {
  const { currentBusinessId } = await requireBusinessContext();
  await requirePermission("warehouse.create");

  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const warehouseType = formData.get("warehouseType") as WarehouseType;
  const location = formData.get("location") as string;
  const isDefault = formData.get("isDefault") === "on";

  if (!name || !code || !warehouseType) {
    throw new Error("Missing required fields");
  }

  // Enforce transactional integrity for defaults
  const warehouse = await db.$transaction(async (tx) => {
    // If this is the first warehouse, it MUST be the default
    const existingCount = await tx.warehouse.count({
      where: { businessId: currentBusinessId, deletedAt: null }
    });
    
    const shouldBeDefault = existingCount === 0 ? true : isDefault;

    // Unset other defaults if this one is going to be default
    if (shouldBeDefault) {
      await tx.warehouse.updateMany({
        where: { businessId: currentBusinessId, isDefault: true, deletedAt: null },
        data: { isDefault: false },
      });
    }

    return await tx.warehouse.create({
      data: {
        businessId: currentBusinessId,
        name,
        code,
        warehouseType,
        location,
        isDefault: shouldBeDefault,
      },
    });
  });

  revalidatePath("/dashboard/inventory/warehouses");
  return { success: true, warehouseId: warehouse.id };
}
