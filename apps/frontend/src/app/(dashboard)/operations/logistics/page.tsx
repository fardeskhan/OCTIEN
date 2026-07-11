export const dynamic = "force-dynamic";

import Link from "next/link";
import { MapPin, Users, FileText, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ControlTowerClient, type CTRun, type CTKpis } from "./control-tower-client";

const NAV = [
  { title: "Stops", href: "/operations/logistics/stops", icon: MapPin },
  { title: "Fleet & Drivers", href: "/operations/logistics/transporters", icon: Users },
  { title: "E-Way Bills", href: "/operations/logistics/ewb", icon: FileText },
  { title: "Exceptions", href: "/operations/logistics/exceptions", icon: AlertTriangle },
];

export default async function LogisticsControlTowerPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("logistics.read");

  const activeRuns = await db.deliveryRun.findMany({
    where: { businessId, status: { in: ["SCHEDULED", "LOADING", "IN_TRANSIT"] } },
    include: {
      stops: { orderBy: { stopSequence: "asc" } },
      driver: { select: { name: true } },
      vehicle: { select: { registration: true } },
      transporter: { select: { name: true } },
    },
    orderBy: { dispatchDate: "asc" },
  });

  // E-Way bills matched to a run by vehicle registration (seeded link).
  const ewbs = await db.eWayBill.findMany({ where: { businessId }, select: { vehicleNumber: true, status: true } });
  const ewbByVehicle = new Map<string, { total: number; generated: number }>();
  for (const e of ewbs) {
    if (!e.vehicleNumber) continue;
    const cur = ewbByVehicle.get(e.vehicleNumber) ?? { total: 0, generated: 0 };
    cur.total += 1;
    if (e.status === "GENERATED") cur.generated += 1;
    ewbByVehicle.set(e.vehicleNumber, cur);
  }

  // Customer names for stops.
  const custIds = [...new Set(activeRuns.flatMap((r) => r.stops.map((s) => s.customerId).filter((x): x is string => !!x)))];
  const customers = await db.customer.findMany({ where: { id: { in: custIds } }, select: { id: true, name: true } });
  const custName = new Map(customers.map((c) => [c.id, c.name]));

  const fmtEta = (d: Date | null) => (d ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : undefined);

  const runs: CTRun[] = activeRuns
    .map((r) => {
      const ewb = r.vehicle ? ewbByVehicle.get(r.vehicle.registration) : undefined;
      return {
        id: r.id,
        code: r.code,
        status: r.status,
        driver: r.driver?.name,
        vehicle: r.vehicle?.registration,
        transporter: r.transporter?.name,
        shipmentCount: r.stops.filter((s) => s.customerId).length,
        ewbStatus: ewb ? `${ewb.generated}/${ewb.total} generated` : "—",
        stops: r.stops
          .filter((s) => s.latitude != null && s.longitude != null)
          .map((s) => ({
            seq: s.stopSequence,
            name: s.locationName ?? s.city ?? "Stop",
            lat: s.latitude!.toNumber(),
            lng: s.longitude!.toNumber(),
            status: s.status,
            eta: fmtEta(s.expectedArrival),
            customer: s.customerId ? custName.get(s.customerId) : undefined,
          })),
      };
    })
    .filter((r) => r.stops.length > 0);

  const [totalDrivers, totalVehicles, pendingStops, completedStops, ewayGenerated] = await Promise.all([
    db.driver.count({ where: { businessId } }),
    db.vehicle.count({ where: { businessId } }),
    db.deliveryRunStop.count({ where: { businessId, status: "PENDING" } }),
    db.deliveryRunStop.count({ where: { businessId, status: "COMPLETED" } }),
    db.eWayBill.count({ where: { businessId, status: "GENERATED" } }),
  ]);

  const kpis: CTKpis = {
    activeRuns: runs.length,
    deliveriesToday: completedStops,
    pendingStops,
    activeVehicles: new Set(activeRuns.map((r) => r.vehicleId)).size,
    activeDrivers: new Set(activeRuns.map((r) => r.driverId).filter(Boolean)).size,
    ewayBills: ewayGenerated,
  };

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Logistics Control Tower"
        description="Live delivery runs, routes, fleet, and E-Way bills."
        actions={
          <div className="flex flex-wrap gap-2">
            {NAV.map((n) => (
              <Link key={n.title} href={n.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <n.icon className="h-4 w-4" /> {n.title}
              </Link>
            ))}
          </div>
        }
      />

      {runs.length === 0 && totalDrivers === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No logistics data for this business yet.</CardContent></Card>
      ) : (
        <ControlTowerClient runs={runs} kpis={kpis} />
      )}
    </WorkspaceLayout>
  );
}
