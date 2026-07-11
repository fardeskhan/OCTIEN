export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function LogisticsExceptionsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("logistics.read");

  const [skippedStops, failedEwb] = await Promise.all([
    db.deliveryRunStop.findMany({
      where: { businessId, status: "SKIPPED" },
      include: { deliveryRun: { select: { code: true } } },
      take: 100,
    }),
    db.eWayBill.findMany({ where: { businessId, status: { in: ["FAILED", "EXPIRED"] } }, take: 100 }),
  ]);

  const hasNone = skippedStops.length === 0 && failedEwb.length === 0;

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Logistics Exceptions" description="Skipped stops and failed / expired E-Way bills that need attention." />
      {hasNone ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No open logistics exceptions. 🎉</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {skippedStops.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="border-b border-border p-3 text-sm font-semibold text-muted-foreground">Skipped Stops</div>
                <div className="divide-y divide-border">
                  {skippedStops.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3">
                      <span className="text-sm">{s.deliveryRun.code} · Stop {s.stopSequence} · {s.locationName ?? s.city}</span>
                      <Badge variant="destructive">SKIPPED</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {failedEwb.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="border-b border-border p-3 text-sm font-semibold text-muted-foreground">E-Way Bill Issues</div>
                <div className="divide-y divide-border">
                  {failedEwb.map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-3">
                      <span className="text-sm font-mono">{e.ewbNumber}</span>
                      <Badge variant="destructive">{e.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </WorkspaceLayout>
  );
}
