export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", INACTIVE: "Inactive", DISCONTINUED: "Discontinued" };

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");

  const product = await db.product.findFirst({
    where: { id, businessId, deletedAt: null },
    include: {
      category: { select: { name: true } },
      variants: { where: { deletedAt: null }, include: { unit: { select: { symbol: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!product) notFound();

  const projections = await db.inventoryVariantProjection.findMany({
    where: { businessId, variantId: { in: product.variants.map((v) => v.id) } },
  });
  const stockByVariant = new Map<string, number>();
  for (const p of projections) stockByVariant.set(p.variantId, (stockByVariant.get(p.variantId) ?? 0) + p.onHandQuantity);
  const totalStock = product.variants.reduce((s, v) => s + (stockByVariant.get(v.id) ?? 0), 0);
  const invValue = projections.reduce((s, p) => s + p.onHandQuantity * p.averageCost.toNumber(), 0);

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title={product.name}
        description={product.description ?? (product.category ? product.category.name : "Product")}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/inventory/products/${product.id}/variants`} className={buttonVariants()}>
              <Layers className="h-4 w-4" /> Manage Variants
            </Link>
            <Link href="/inventory/products" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="h-4 w-4" /> Products
            </Link>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>{STATUS_LABEL[product.status] ?? product.status}</Badge>
        <span className="text-sm text-muted-foreground">{product.type}</span>
        {product.category && <span className="text-sm text-muted-foreground">· {product.category.name}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Variants" value={product.variants.length} freshness="Live" />
        <KPICard title="Units On Hand" value={Math.round(totalStock).toLocaleString("en-IN")} freshness="Live" />
        <KPICard title="Inventory Value" value={formatINR(invValue)} freshness="Live" />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Variants</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 font-medium">Unit</th>
                <th className="p-3 font-medium text-right">Price</th>
                <th className="p-3 font-medium text-right">On Hand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {product.variants.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{v.name}</td>
                  <td className="p-3 font-mono text-xs">{v.sku}</td>
                  <td className="p-3 text-muted-foreground">{v.unit?.symbol ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">{formatINR(v.price)}</td>
                  <td className="p-3 text-right tabular-nums">{Math.round(stockByVariant.get(v.id) ?? 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}
