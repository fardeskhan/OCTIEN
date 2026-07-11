export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { buttonVariants } from "@/components/ui/button";
import { VariantsManager } from "./variants-manager";

export default async function ProductVariantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("product.update");

  const product = await db.product.findFirst({
    where: { id, businessId, deletedAt: null },
    include: {
      category: { select: { name: true } },
      variants: { where: { deletedAt: null }, include: { unit: { select: { symbol: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!product) notFound();

  const units = await db.unit.findMany({ where: { businessId, deletedAt: null }, select: { id: true, name: true, symbol: true }, orderBy: { name: "asc" } });

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title={`${product.name} · Variants`}
        description={`Manage the variants (SKUs) for this product.${product.category ? ` Category: ${product.category.name}.` : ""}`}
        actions={
          <Link href="/inventory/products" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" /> Products
          </Link>
        }
      />
      <VariantsManager
        productId={product.id}
        units={units}
        variants={product.variants.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku ?? "",
          price: v.price,
          cost: v.cost,
          unit: v.unit?.symbol ?? "",
        }))}
      />
    </WorkspaceLayout>
  );
}
