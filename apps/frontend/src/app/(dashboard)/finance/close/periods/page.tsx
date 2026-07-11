export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PeriodsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const periods = await db.accountingPeriod.findMany({ where: { businessId }, orderBy: { startDate: "desc" } });
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Accounting Periods" description="Period close status and history." />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Period</th>
                <th className="p-3 font-medium">Start</th>
                <th className="p-3 font-medium">End</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {periods.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No accounting periods defined.</td></tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-muted-foreground">{fmt(p.startDate)}</td>
                    <td className="p-3 text-muted-foreground">{fmt(p.endDate)}</td>
                    <td className="p-3">
                      <Badge variant={p.status === "OPEN" ? "default" : p.status === "CLOSED" ? "secondary" : "warning"}>{p.status}</Badge>
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
