export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DepreciationPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const schedules = await db.depreciationSchedule.findMany({
    where: { asset: { businessId } },
    include: { asset: { select: { assetCode: true, name: true } } },
    orderBy: { scheduledDate: "desc" },
    take: 100,
  });

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Depreciation" description="Scheduled and posted depreciation across fixed assets." />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Asset</th>
                <th className="p-3 font-medium">Scheduled Date</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Scheduled</th>
                <th className="p-3 font-medium text-right">Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schedules.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No depreciation schedules yet. They are generated when assets are capitalised.</td></tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{s.asset.assetCode} · {s.asset.name}</td>
                    <td className="p-3 text-muted-foreground">{s.scheduledDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="p-3"><Badge variant={s.status === "POSTED" ? "default" : "secondary"}>{s.status}</Badge></td>
                    <td className="p-3 text-right tabular-nums">{formatINR(s.scheduledAmount.toNumber())}</td>
                    <td className="p-3 text-right tabular-nums">{formatINR(s.postedAmount.toNumber())}</td>
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
