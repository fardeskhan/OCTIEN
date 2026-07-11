export const dynamic = "force-dynamic";

import Link from "next/link";
import { Package, Warehouse as WarehouseIcon, TrendingUp, Layers, AlertTriangle, ArrowRightLeft, SlidersHorizontal } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";

const SECTIONS = [
  { title: "Products", href: "/inventory/products", icon: Package, desc: "Catalog & variants" },
  { title: "Valuation", href: "/inventory/valuation", icon: TrendingUp, desc: "Stock value at average cost" },
  { title: "Movements", href: "/inventory/movements", icon: Layers, desc: "The stock ledger" },
  { title: "Adjustments", href: "/inventory/adjustments", icon: SlidersHorizontal, desc: "Cycle counts & corrections" },
  { title: "Transfers", href: "/inventory/transfers", icon: ArrowRightLeft, desc: "Warehouse to warehouse" },
  { title: "Warehouses", href: "/inventory/warehouses", icon: WarehouseIcon, desc: "Storage locations" },
];

export default async function InventoryOverviewPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");

  const [projections, productCount, warehouseCount] = await Promise.all([
    db.inventoryVariantProjection.findMany({ where: { businessId } }),
    db.product.count({ where: { businessId, deletedAt: null } }),
    db.warehouse.count({ where: { businessId } }),
  ]);

  const totalValue = projections.reduce((s, p) => s + p.onHandQuantity * p.averageCost.toNumber(), 0);
  const totalUnits = projections.reduce((s, p) => s + p.onHandQuantity, 0);

  // Low-stock alerts: bottom quartile of on-hand across active SKUs.
  const stocked = projections.filter((p) => p.onHandQuantity > 0).sort((a, b) => a.onHandQuantity - b.onHandQuantity);
  const threshold = stocked.length ? stocked[Math.floor(stocked.length * 0.25)]?.onHandQuantity ?? 0 : 0;
  const lowStock = stocked.filter((p) => p.onHandQuantity <= threshold).slice(0, 5);
  const lowVariantIds = lowStock.map((p) => p.variantId);
  const lowVariants = lowVariantIds.length
    ? await db.productVariant.findMany({ where: { id: { in: lowVariantIds } }, select: { id: true, name: true, sku: true } })
    : [];
  const lvName = new Map(lowVariants.map((v) => [v.id, v]));

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Inventory" description="Stock position, valuation, and product catalog." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Inventory Value" value={formatINR(totalValue)} freshness="Live" />
        <KPICard title="Products" value={productCount} freshness="Live" />
        <KPICard title="Units On Hand" value={Math.round(totalUnits).toLocaleString("en-IN")} freshness="Live" />
        <KPICard title="Warehouses" value={warehouseCount} freshness="Live" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {SECTIONS.map((s) => (
          <Link key={s.title} href={s.href}>
            <Card className="h-full hover:shadow-md hover:border-primary/40 transition-all">
              <CardContent className="p-4 flex flex-col gap-2">
                <s.icon className="h-5 w-5 text-muted-foreground" />
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {lowStock.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock — Reorder Suggestions
            </div>
            <div className="divide-y divide-border">
              {lowStock.map((p) => {
                const v = lvName.get(p.variantId);
                const suggested = Math.max(Math.round(threshold * 2 - p.onHandQuantity), 100);
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <span className="font-medium">{v?.name ?? "—"}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{v?.sku ?? ""}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="tabular-nums text-amber-600 dark:text-amber-500">{Math.round(p.onHandQuantity).toLocaleString("en-IN")} on hand</span>
                      <span className="text-xs text-muted-foreground">suggest reorder ~{suggested.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </WorkspaceLayout>
  );
}
