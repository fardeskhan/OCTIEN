// @ts-nocheck
"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ProductType } from "@prisma/client";

export async function createProduct(formData: FormData) {
  const { currentBusinessId } = await requireBusinessContext();
  await requirePermission("product.create");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const categoryId = formData.get("categoryId") as string;
  const type = formData.get("type") as ProductType;
  const unitId = formData.get("unitId") as string;

  if (!name || !type || !unitId) {
    throw new Error("Missing required fields");
  }

  // Auto-generate SKU based on product name
  const skuPrefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  const uniqueId = Math.floor(1000 + Math.random() * 9000);
  const generatedSku = `${skuPrefix}-${uniqueId}`;

  const product = await db.product.create({
    data: {
      businessId: currentBusinessId,
      name,
      description,
      categoryId: categoryId || null,
      type,
      variants: {
        create: {
          businessId: currentBusinessId,
          name: "Default",
          unitId,
          sku: generatedSku,
        }
      }
    },
  });

  revalidatePath("/dashboard/products");
  
  // The user requested redirecting to Manage Variants
  redirect(`/dashboard/products/${product.id}/variants`);
}

export async function createVariant(formData: FormData) {
  const { currentBusinessId } = await requireBusinessContext();
  await requirePermission("product.update");

  const productId = formData.get("productId") as string;
  const name = formData.get("name") as string;
  const unitId = formData.get("unitId") as string;
  let sku = formData.get("sku") as string;
  const price = parseFloat(formData.get("price") as string) || 0;
  const cost = parseFloat(formData.get("cost") as string) || 0;

  if (!productId || !name || !unitId) {
    throw new Error("Missing required fields");
  }

  if (!sku) {
    const skuPrefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
    const uniqueId = Math.floor(1000 + Math.random() * 9000);
    sku = `${skuPrefix}-${uniqueId}`;
  }

  await db.productVariant.create({
    data: {
      businessId: currentBusinessId,
      productId,
      name,
      unitId,
      sku,
      price,
      cost
    },
  });

  revalidatePath(`/dashboard/products/${productId}/variants`);
  return { success: true };
}
