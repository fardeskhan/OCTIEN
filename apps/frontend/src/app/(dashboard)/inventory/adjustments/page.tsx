export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { AdjustmentForm } from "./adjustment-form";

export default async function InventoryAdjustmentsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");

  const [adjustments, variants, warehouses] = await Promise.all([
    db.stockMovementRecord.findMany({ where: { businessId, type: "ADJUSTED" }, orderBy: { occurredAt: "desc" }, take: 100 }),
    db.productVariant.findMany({ where: { businessId, deletedAt: null }, include: { unit: { select: { symbol: true } } }, orderBy: { name: "asc" } }),
    db.warehouse.findMany({ where: { businessId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const vName = new Map(variants.map((v) => [v.id, v.name]));
  const wName = new Map(warehouses.map((w) => [w.id, w.name]));

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Inventory Adjustments" description="Cycle counts and corrections — posts to the stock ledger and updates on-hand." />

      <AdjustmentForm
        variants={variants.map((v) => ({ id: v.id, name: v.name, unit: v.unit?.symbol ?? "PCS" }))}
        warehouses={warehouses}
      />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium">Warehouse</th>
                <th className="p-3 font-medium text-right">Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {adjustments.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No adjustments posted yet.</td></tr>
              ) : (
                adjustments.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{m.occurredAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="p-3 font-medium">{vName.get(m.variantId) ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{wName.get(m.warehouseId) ?? "—"}</td>
                    <td className={`p-3 text-right tabular-nums font-medium ${m.quantityValue >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"}`}>
                      {m.quantityValue >= 0 ? "+" : ""}{Math.round(m.quantityValue).toLocaleString("en-IN")} {m.quantityUnit}
                    </td>
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
