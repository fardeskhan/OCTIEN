"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ProductType } from "@prisma/client";

function genSku(name: string): string {
  const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "X") || "PRD";
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

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
          sku: genSku(name),
        },
      },
    },
  });

  revalidatePath("/inventory/products");
  redirect(`/inventory/products/${product.id}/variants`);
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

  // Confirm the product belongs to the active business (multi-tenant isolation).
  const product = await db.product.findFirst({ where: { id: productId, businessId: currentBusinessId, deletedAt: null } });
  if (!product) throw new Error("Product not found");

  if (!sku) sku = genSku(name);

  await db.productVariant.create({
    data: { businessId: currentBusinessId, productId, name, unitId, sku, price, cost },
  });

  revalidatePath(`/inventory/products/${productId}/variants`);
  return { success: true };
}

export async function updateVariant(data: { id: string; name: string; sku: string; price: number; cost: number }) {
  const { currentBusinessId } = await requireBusinessContext();
  await requirePermission("product.update");

  const variant = await db.productVariant.findFirst({ where: { id: data.id, businessId: currentBusinessId, deletedAt: null } });
  if (!variant) throw new Error("Variant not found");

  await db.productVariant.update({
    where: { id: data.id },
    data: { name: data.name, sku: data.sku || variant.sku, price: data.price, cost: data.cost },
  });

  revalidatePath(`/inventory/products/${variant.productId}/variants`);
  return { success: true };
}

export async function deleteVariant(id: string) {
  const { currentBusinessId } = await requireBusinessContext();
  await requirePermission("product.update");

  const variant = await db.productVariant.findFirst({ where: { id, businessId: currentBusinessId, deletedAt: null } });
  if (!variant) throw new Error("Variant not found");

  const remaining = await db.productVariant.count({ where: { productId: variant.productId, deletedAt: null } });
  if (remaining <= 1) throw new Error("A product must keep at least one variant");

  await db.productVariant.update({ where: { id }, data: { deletedAt: new Date() } });

  revalidatePath(`/inventory/products/${variant.productId}/variants`);
  return { success: true };
}
