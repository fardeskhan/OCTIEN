export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { TransferForm } from "./transfer-form";

export default async function InventoryTransfersPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");

  const [outMoves, variants, warehouses] = await Promise.all([
    db.stockMovementRecord.findMany({ where: { businessId, type: "TRANSFERRED_OUT" }, orderBy: { occurredAt: "desc" }, take: 100 }),
    db.productVariant.findMany({ where: { businessId, deletedAt: null }, include: { unit: { select: { symbol: true } } }, orderBy: { name: "asc" } }),
    db.warehouse.findMany({ where: { businessId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  // Pair each TRANSFERRED_OUT with its RECEIVED counterpart via correlationId to show the target.
  const correlationIds = outMoves.map((m) => m.correlationId).filter((x): x is string => !!x);
  const inMoves = correlationIds.length
    ? await db.stockMovementRecord.findMany({ where: { businessId, type: "RECEIVED", correlationId: { in: correlationIds } } })
    : [];
  const inByCorrelation = new Map(inMoves.map((m) => [m.correlationId, m]));

  const vName = new Map(variants.map((v) => [v.id, v.name]));
  const wName = new Map(warehouses.map((w) => [w.id, w.name]));

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Inventory Transfers" description="Warehouse-to-warehouse stock transfers — double-entry on the stock ledger." />

      <TransferForm
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
                <th className="p-3 font-medium">From</th>
                <th className="p-3 font-medium">To</th>
                <th className="p-3 font-medium text-right">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {outMoves.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No transfers yet. Use the form above to move stock between warehouses.</td></tr>
              ) : (
                outMoves.map((m) => {
                  const counterpart = m.correlationId ? inByCorrelation.get(m.correlationId) : undefined;
                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 whitespace-nowrap text-muted-foreground">{m.occurredAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="p-3 font-medium">{vName.get(m.variantId) ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">{wName.get(m.warehouseId) ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">{counterpart ? wName.get(counterpart.warehouseId) ?? "—" : "—"}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{Math.abs(Math.round(m.quantityValue)).toLocaleString("en-IN")} {m.quantityUnit}</td>
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
