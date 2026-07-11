export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "warning" | "destructive"> = {
  IN_TRANSIT: "default", SCHEDULED: "secondary", LOADING: "warning", COMPLETED: "secondary", CANCELLED: "destructive",
};

export default async function DeliveryRunsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("logistics.read");

  const runs = await db.deliveryRun.findMany({
    where: { businessId },
    include: {
      driver: { select: { name: true } },
      vehicle: { select: { registration: true } },
      transporter: { select: { name: true } },
      _count: { select: { stops: true } },
    },
    orderBy: { dispatchDate: "desc" },
  });

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Delivery Runs" description="Dispatched and scheduled delivery runs." />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Run</th>
                <th className="p-3 font-medium">Dispatch</th>
                <th className="p-3 font-medium">Driver</th>
                <th className="p-3 font-medium">Vehicle</th>
                <th className="p-3 font-medium">Transporter</th>
                <th className="p-3 font-medium text-right">Stops</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No delivery runs.</td></tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{r.code}</td>
                    <td className="p-3 text-muted-foreground">{r.dispatchDate ? r.dispatchDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</td>
                    <td className="p-3">{r.driver?.name ?? "Unassigned"}</td>
                    <td className="p-3 font-mono text-xs">{r.vehicle?.registration ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{r.transporter?.name ?? "—"}</td>
                    <td className="p-3 text-right">{r._count.stops}</td>
                    <td className="p-3"><Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status.replace(/_/g, " ")}</Badge></td>
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
