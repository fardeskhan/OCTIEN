export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AssetRegisterPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const assets = await db.fixedAsset.findMany({
    where: { businessId },
    include: { category: { select: { name: true } }, schedules: { select: { postedAmount: true } } },
    orderBy: { assetCode: "asc" },
  });

  const active = assets.filter((a) => a.status !== "DISPOSED");
  const totalCost = active.reduce((s, a) => s + a.cost.toNumber(), 0);
  const totalDep = active.reduce((s, a) => s + a.schedules.reduce((t, sc) => t + sc.postedAmount.toNumber(), 0), 0);
  const bookValue = totalCost - totalDep;

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Fixed Asset Register" description="Capitalised assets, cost, and net book value." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Active Assets" value={active.length} freshness="Live" />
        <KPICard title="Gross Cost" value={formatINR(totalCost)} freshness="Live" />
        <KPICard title="Net Book Value" value={formatINR(bookValue)} freshness="Live" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Code</th>
                <th className="p-3 font-medium">Asset</th>
                <th className="p-3 font-medium">Category</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No fixed assets recorded yet. Capitalise a purchase to populate the register.</td></tr>
              ) : (
                assets.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{a.assetCode}</td>
                    <td className="p-3 font-medium">{a.name}</td>
                    <td className="p-3 text-muted-foreground">{a.category.name}</td>
                    <td className="p-3"><Badge variant={a.status === "ACTIVE" ? "default" : "secondary"}>{a.status.replace(/_/g, " ")}</Badge></td>
                    <td className="p-3 text-right tabular-nums font-medium">{formatINR(a.cost.toNumber())}</td>
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
