"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Truck, User, MapPin, Clock, Route as RouteIcon, FileText, Package } from "lucide-react";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityDrawer } from "@/components/layout/drawer-layout";
import type { MapRun } from "@/components/logistics/delivery-map";

const DeliveryMap = dynamic(() => import("@/components/logistics/delivery-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export interface CTStop { seq: number; name: string; lat: number; lng: number; status: string; eta?: string; customer?: string }
export interface CTRun {
  id: string; code: string; status: string;
  driver?: string; vehicle?: string; transporter?: string;
  shipmentCount: number; ewbStatus: string;
  stops: CTStop[];
}
export interface CTKpis {
  activeRuns: number; deliveriesToday: number; pendingStops: number;
  activeVehicles: number; activeDrivers: number; ewayBills: number;
}

const RUN_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#0ea5e9", "#eab308", "#22c55e"];
const STATUS_VARIANT: Record<string, "default" | "secondary" | "warning" | "destructive"> = {
  IN_TRANSIT: "default", SCHEDULED: "secondary", LOADING: "warning", COMPLETED: "secondary", CANCELLED: "destructive",
};

function haversineKm(a: CTStop, b: CTStop): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}
function routeDistanceKm(stops: CTStop[]): number {
  let d = 0;
  for (let i = 1; i < stops.length; i++) d += haversineKm(stops[i - 1], stops[i]);
  return Math.round(d);
}
function nextEta(stops: CTStop[]): string {
  const pending = stops.find((s) => s.status === "PENDING" || s.status === "ARRIVED");
  return pending?.eta ?? stops[stops.length - 1]?.eta ?? "—";
}

export function ControlTowerClient({ runs, kpis }: { runs: CTRun[]; kpis: CTKpis }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(runs[0]?.id ?? null);
  const [drawerId, setDrawerId] = React.useState<string | null>(null);

  const mapRuns: MapRun[] = runs.map((r, i) => ({
    id: r.id, code: r.code, color: RUN_COLORS[i % RUN_COLORS.length],
    driver: r.driver, vehicle: r.vehicle, stops: r.stops,
  }));

  const selected = runs.find((r) => r.id === selectedId) ?? runs[0] ?? null;
  const drawerRun = runs.find((r) => r.id === drawerId) ?? null;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Active Runs" value={kpis.activeRuns} freshness="Live" />
        <KPICard title="Deliveries Today" value={kpis.deliveriesToday} freshness="Live" />
        <KPICard title="Pending Stops" value={kpis.pendingStops} variant="warning" freshness="Live" />
        <KPICard title="Active Vehicles" value={kpis.activeVehicles} freshness="Live" />
        <KPICard title="Active Drivers" value={kpis.activeDrivers} freshness="Live" />
        <KPICard title="E-Way Bills" value={kpis.ewayBills} freshness="Live" />
      </div>

      {/* Map + details */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DeliveryMap runs={mapRuns} selectedRunId={selectedId} onSelectRun={setSelectedId} />
        </div>
        <div>
          <Card className="h-full">
            <CardContent className="p-4">
              {!selected ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No active runs.</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold">{selected.code}</div>
                    <Badge variant={STATUS_VARIANT[selected.status] ?? "secondary"}>{selected.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <Row icon={User} label="Driver" value={selected.driver ?? "Unassigned"} />
                    <Row icon={Truck} label="Vehicle" value={selected.vehicle ?? "—"} />
                    <Row icon={RouteIcon} label="Transporter" value={selected.transporter ?? "—"} />
                    <Row icon={MapPin} label="Stops" value={`${selected.stops.length}`} />
                    <Row icon={RouteIcon} label="Distance" value={`${routeDistanceKm(selected.stops)} km`} />
                    <Row icon={Clock} label="Next ETA" value={nextEta(selected.stops)} />
                    <Row icon={Package} label="Shipments" value={`${selected.shipmentCount}`} />
                    <Row icon={FileText} label="E-Way" value={selected.ewbStatus} />
                  </dl>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stop Timeline</div>
                    <ol className="space-y-2">
                      {selected.stops.map((s) => (
                        <li key={s.seq} className="flex items-center gap-2 text-sm">
                          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${s.status === "COMPLETED" ? "bg-emerald-500" : s.status === "ARRIVED" ? "bg-amber-500" : "bg-slate-400"}`}>{s.seq}</span>
                          <span className="flex-1">{s.name}</span>
                          <span className="text-xs text-muted-foreground">{s.eta ?? ""}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setDrawerId(selected.id)}>Full Run Details</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Active runs table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Run #</th>
                <th className="p-3 font-medium">Driver</th>
                <th className="p-3 font-medium">Vehicle</th>
                <th className="p-3 font-medium text-right">Stops</th>
                <th className="p-3 font-medium">ETA</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No active runs.</td></tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className={`cursor-pointer transition-colors hover:bg-muted/30 ${selectedId === r.id ? "bg-primary/5" : ""}`} onClick={() => setSelectedId(r.id)}>
                    <td className="p-3 font-medium">{r.code}</td>
                    <td className="p-3">{r.driver ?? "Unassigned"}</td>
                    <td className="p-3 font-mono text-xs">{r.vehicle ?? "—"}</td>
                    <td className="p-3 text-right">{r.stops.length}</td>
                    <td className="p-3 text-muted-foreground">{nextEta(r.stops)}</td>
                    <td className="p-3"><Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status.replace(/_/g, " ")}</Badge></td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDrawerId(r.id); }}>Details</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <EntityDrawer
        open={!!drawerRun}
        onOpenChange={(o) => !o && setDrawerId(null)}
        title={drawerRun ? `Run ${drawerRun.code}` : ""}
        kpis={drawerRun ? (
          <>
            <DrawerKpi label="Stops" value={`${drawerRun.stops.length}`} />
            <DrawerKpi label="Distance" value={`${routeDistanceKm(drawerRun.stops)} km`} />
            <DrawerKpi label="Next ETA" value={nextEta(drawerRun.stops)} />
            <DrawerKpi label="Status" value={drawerRun.status.replace(/_/g, " ")} />
          </>
        ) : null}
      >
        {drawerRun && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-medium">Assignment</h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Row icon={User} label="Driver" value={drawerRun.driver ?? "Unassigned"} />
                <Row icon={Truck} label="Vehicle" value={drawerRun.vehicle ?? "—"} />
                <Row icon={RouteIcon} label="Transporter" value={drawerRun.transporter ?? "—"} />
                <Row icon={Package} label="Shipments" value={`${drawerRun.shipmentCount}`} />
                <Row icon={FileText} label="E-Way" value={drawerRun.ewbStatus} />
              </dl>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium">Route ({drawerRun.stops.length} stops)</h3>
              <ol className="space-y-2">
                {drawerRun.stops.map((s) => (
                  <li key={s.seq} className="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ${s.status === "COMPLETED" ? "bg-emerald-500" : s.status === "ARRIVED" ? "bg-amber-500" : "bg-slate-400"}`}>{s.seq}</span>
                    <div className="flex-1">
                      <div className="font-medium">{s.name}</div>
                      {s.customer && <div className="text-xs text-muted-foreground">{s.customer}</div>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">{s.status}<br />{s.eta ?? ""}</div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </EntityDrawer>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}
function DrawerKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
