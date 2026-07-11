"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";

export async function createUnit(formData: FormData) {
  const { currentBusinessId } = await requireBusinessContext();
  await requirePermission("reference.create");

  const name = formData.get("name") as string;
  const symbol = formData.get("symbol") as string;

  if (!name || !symbol) {
    throw new Error("Missing required fields");
  }

  const unit = await db.unit.create({
    data: {
      businessId: currentBusinessId,
      name,
      symbol,
    },
  });

  revalidatePath("/dashboard/reference");
  return { success: true, unitId: unit.id };
}

export async function createCategory(formData: FormData) {
  const { currentBusinessId } = await requireBusinessContext();
  await requirePermission("reference.create");

  const name = formData.get("name") as string;
  const parentId = formData.get("parentId") as string;

  if (!name) {
    throw new Error("Missing name");
  }

  const category = await db.category.create({
    data: {
      businessId: currentBusinessId,
      name,
      parentId: parentId || null,
    },
  });

  revalidatePath("/dashboard/reference");
  return { success: true, categoryId: category.id };
}
