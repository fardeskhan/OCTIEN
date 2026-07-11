export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function InventoryValuationPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");

  const [projections, variants, warehouses] = await Promise.all([
    db.inventoryVariantProjection.findMany({ where: { businessId } }),
    db.productVariant.findMany({ where: { businessId, deletedAt: null }, select: { id: true, name: true, sku: true } }),
    db.warehouse.findMany({ where: { businessId }, select: { id: true, name: true } }),
  ]);

  const vName = new Map(variants.map((v) => [v.id, v]));
  const wName = new Map(warehouses.map((w) => [w.id, w.name]));

  const rows = projections
    .map((p) => {
      const value = p.onHandQuantity * p.averageCost.toNumber();
      return {
        id: p.id,
        variant: vName.get(p.variantId)?.name ?? "—",
        sku: vName.get(p.variantId)?.sku ?? "—",
        warehouse: wName.get(p.warehouseId) ?? "—",
        onHand: p.onHandQuantity,
        avgCost: p.averageCost.toNumber(),
        value,
      };
    })
    .sort((a, b) => b.value - a.value);

  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalUnits = rows.reduce((s, r) => s + r.onHand, 0);

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Inventory Valuation" description="On-hand stock valued at average cost." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total Inventory Value" value={formatINR(totalValue)} freshness="Live" />
        <KPICard title="SKUs On Hand" value={rows.length} freshness="Live" />
        <KPICard title="Total Units" value={Math.round(totalUnits).toLocaleString("en-IN")} freshness="Live" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium">Warehouse</th>
                <th className="p-3 font-medium text-right">On Hand</th>
                <th className="p-3 font-medium text-right">Avg Cost</th>
                <th className="p-3 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No stock on hand.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{r.sku}</td>
                    <td className="p-3">{r.variant}</td>
                    <td className="p-3 text-muted-foreground">{r.warehouse}</td>
                    <td className="p-3 text-right tabular-nums">{Math.round(r.onHand).toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right tabular-nums">{formatINR(r.avgCost)}</td>
                    <td className="p-3 text-right tabular-nums font-medium">{formatINR(r.value)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}
