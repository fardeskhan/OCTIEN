export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function FleetPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("logistics.read");

  const [transporters, vehicles, drivers, activeRuns] = await Promise.all([
    db.transporter.findMany({ where: { businessId }, orderBy: { name: "asc" } }),
    db.vehicle.findMany({ where: { businessId }, include: { transporter: { select: { name: true } } }, orderBy: { registration: "asc" } }),
    db.driver.findMany({ where: { businessId }, include: { defaultVehicle: { select: { registration: true } } }, orderBy: { name: "asc" } }),
    db.deliveryRun.findMany({ where: { businessId, status: { in: ["SCHEDULED", "LOADING", "IN_TRANSIT"] } }, select: { vehicleId: true, driverId: true } }),
  ]);

  const busyVehicles = new Set(activeRuns.map((r) => r.vehicleId));
  const busyDrivers = new Set(activeRuns.map((r) => r.driverId).filter(Boolean));

  const vehicleStatus = (id: string) => (busyVehicles.has(id) ? { label: "Assigned", variant: "default" as const } : { label: "Available", variant: "secondary" as const });
  const driverStatus = (id: string) => (busyDrivers.has(id) ? { label: "On Route", variant: "default" as const } : { label: "Available", variant: "secondary" as const });

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Fleet & Drivers" description="Transporters, vehicles, and drivers — with live availability." />

      <div className="grid grid-cols-3 gap-4">
        <KPICard title="Transporters" value={transporters.length} freshness="Live" />
        <KPICard title="Vehicles" value={`${busyVehicles.size}/${vehicles.length} assigned`} freshness="Live" />
        <KPICard title="Drivers" value={`${busyDrivers.size}/${drivers.length} on route`} freshness="Live" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Vehicles</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {vehicles.map((v) => {
              const st = vehicleStatus(v.id);
              return (
                <div key={v.id} className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-sm font-medium font-mono">{v.registration}</div>
                    <div className="text-xs text-muted-foreground">{v.type ?? "Vehicle"} · {v.transporter.name}{v.capacityKg ? ` · ${v.capacityKg.toNumber()} kg` : ""}</div>
                  </div>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Drivers</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {drivers.map((d) => {
              const st = driverStatus(d.id);
              return (
                <div key={d.id} className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-sm font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.phone ?? ""} · Lic {d.licenseNumber ?? "—"}{d.defaultVehicle ? ` · ${d.defaultVehicle.registration}` : ""}</div>
                  </div>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Transporters</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {transporters.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.code} · GSTIN {t.gstin ?? "—"}</div>
              </div>
              <div className="text-xs text-muted-foreground">{t.phone ?? ""}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}
