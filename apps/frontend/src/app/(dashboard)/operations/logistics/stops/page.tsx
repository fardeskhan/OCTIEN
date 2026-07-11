export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "warning" | "destructive"> = {
  COMPLETED: "default", ARRIVED: "warning", PENDING: "secondary", SKIPPED: "destructive",
};

export default async function DeliveryStopsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("logistics.read");

  const stops = await db.deliveryRunStop.findMany({
    where: { businessId },
    include: { deliveryRun: { select: { code: true } } },
    orderBy: [{ deliveryRunId: "asc" }, { stopSequence: "asc" }],
    take: 200,
  });
  const customerIds = [...new Set(stops.map((s) => s.customerId).filter((x): x is string => !!x))];
  const customers = await db.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true } });
  const customerName = new Map(customers.map((c) => [c.id, c.name]));

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Delivery Stops" description="Planned and completed stops across all runs, with ETAs." />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Run</th>
                <th className="p-3 font-medium">#</th>
                <th className="p-3 font-medium">Location</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">ETA</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stops.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No stops.</td></tr>
              ) : (
                stops.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{s.deliveryRun.code}</td>
                    <td className="p-3 text-muted-foreground">{s.stopSequence}</td>
                    <td className="p-3">{s.locationName ?? s.city ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{(s.customerId && customerName.get(s.customerId)) || "—"}</td>
                    <td className="p-3 text-muted-foreground">{s.expectedArrival ? s.expectedArrival.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="p-3"><Badge variant={STATUS_VARIANT[s.status] ?? "secondary"}>{s.status}</Badge></td>
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
