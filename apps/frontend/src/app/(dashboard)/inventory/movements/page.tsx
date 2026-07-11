export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TYPE_VARIANT: Record<string, "default" | "secondary" | "warning" | "destructive"> = {
  RECEIVED: "default", DISPATCHED: "secondary", ADJUSTED: "warning", TRANSFERRED_OUT: "secondary",
};

export default async function InventoryMovementsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");

  const movements = await db.stockMovementRecord.findMany({
    where: { businessId },
    orderBy: { occurredAt: "desc" },
    take: 200,
  });

  const variantIds = [...new Set(movements.map((m) => m.variantId))];
  const warehouseIds = [...new Set(movements.map((m) => m.warehouseId))];
  const [variants, warehouses] = await Promise.all([
    db.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, name: true, sku: true } }),
    db.warehouse.findMany({ where: { id: { in: warehouseIds } }, select: { id: true, name: true } }),
  ]);
  const vName = new Map(variants.map((v) => [v.id, v]));
  const wName = new Map(warehouses.map((w) => [w.id, w.name]));

  const inQty = movements.filter((m) => m.quantityValue > 0).reduce((s, m) => s + m.quantityValue, 0);
  const outQty = movements.filter((m) => m.quantityValue < 0).reduce((s, m) => s + Math.abs(m.quantityValue), 0);

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Stock Movements" description="The stock ledger — every receipt, dispatch, transfer, and adjustment." />

      <div className="grid grid-cols-3 gap-4">
        <KPICard title="Movements" value={movements.length} freshness="Live" />
        <KPICard title="Units In" value={`+${Math.round(inQty).toLocaleString("en-IN")}`} variant="success" freshness="Live" />
        <KPICard title="Units Out" value={`-${Math.round(outQty).toLocaleString("en-IN")}`} variant="destructive" freshness="Live" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium">Warehouse</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium text-right">Quantity</th>
                <th className="p-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No stock movements recorded yet.</td></tr>
              ) : (
                movements.map((m) => {
                  const v = vName.get(m.variantId);
                  const meta = m.metadata as { note?: string } | null;
                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 whitespace-nowrap text-muted-foreground">{m.occurredAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                      <td className="p-3">
                        <div className="font-medium">{v?.name ?? "—"}</div>
                        <div className="font-mono text-xs text-muted-foreground">{v?.sku ?? ""}</div>
                      </td>
                      <td className="p-3 text-muted-foreground">{wName.get(m.warehouseId) ?? "—"}</td>
                      <td className="p-3"><Badge variant={TYPE_VARIANT[m.type] ?? "secondary"}>{m.type.replace(/_/g, " ")}</Badge></td>
                      <td className={`p-3 text-right tabular-nums font-medium ${m.quantityValue >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"}`}>
                        {m.quantityValue >= 0 ? "+" : ""}{Math.round(m.quantityValue).toLocaleString("en-IN")} {m.quantityUnit}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{meta?.note ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}
