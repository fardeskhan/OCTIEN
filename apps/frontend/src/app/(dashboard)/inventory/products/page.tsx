export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { ProductsList } from "./products-list";
import type { Product } from "@/types";

const STATUS_MAP: Record<string, Product["status"]> = {
  ACTIVE: "Active",
  INACTIVE: "Draft",
  DISCONTINUED: "Archived",
};

export default async function ProductsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");

  const [products, projections] = await Promise.all([
    db.product.findMany({
      where: { businessId, deletedAt: null },
      include: { category: true, variants: { where: { deletedAt: null } } },
      orderBy: { createdAt: "desc" },
    }),
    db.inventoryVariantProjection.findMany({ where: { businessId } }),
  ]);

  const stockByVariant = new Map<string, number>();
  for (const proj of projections) {
    stockByVariant.set(proj.variantId, (stockByVariant.get(proj.variantId) ?? 0) + proj.onHandQuantity);
  }

  const data: Product[] = products.map((p) => {
    const firstVariant = p.variants[0];
    const stock = p.variants.reduce((s, v) => s + (stockByVariant.get(v.id) ?? 0), 0);
    return {
      id: p.id,
      code: firstVariant?.sku ?? p.id.slice(0, 8).toUpperCase(),
      name: p.name,
      category: p.category?.name ?? "Uncategorized",
      status: STATUS_MAP[p.status] ?? "Draft",
      stock: Math.round(stock),
      price: firstVariant?.price ?? 0,
    };
  });

  return <ProductsList data={data} />;
}
