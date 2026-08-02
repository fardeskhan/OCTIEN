export const dynamic = "force-dynamic";

import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getInventoryDashboard } from "@/lib/inventory/inventory-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardBarChart } from "@/components/ui/chart-wrappers";
import { formatINR } from "@/lib/currency";
import { formatNumber } from "@/lib/utils";
import { EnterprisePage, EnterprisePageHeader, EnterpriseKPIRow, EnterpriseStatCard } from "@/components/enterprise";

function ListCard({ title, rows, empty = "No data." }: { title: string; rows: { label: string; sub?: string; value: string }[]; empty?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-medium">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{r.label}</div>
                {r.sub && <div className="truncate text-xs text-muted-foreground">{r.sub}</div>}
              </div>
              <span className="shrink-0 tabular-nums text-muted-foreground">{r.value}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

const NAV = [
  ["Overview", "/inventory/dashboard"],
  ["Stock Ledger", "/inventory/stock-ledger"],
  ["Valuation", "/inventory/valuation"],
  ["Movements", "/inventory/movements"],
  ["Reports", "/inventory/reports"],
] as const;

export default async function InventoryDashboardPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");

  const d = await getInventoryDashboard(businessId);
  const { kpis } = d;

  return (
    <EnterprisePage>
      <EnterprisePageHeader title="Inventory Dashboard" description="Live stock position, valuation and movement." />

      <div className="flex flex-wrap gap-4 border-b border-border pb-3 text-sm font-medium">
        {NAV.map(([label, href]) => (
          <Link key={href} href={href} className={href === "/inventory/dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"}>
            {label}
          </Link>
        ))}
      </div>

      {d.alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {d.alerts.map((a, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
                a.tone === "danger"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : a.tone === "warning"
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "border-border bg-muted text-muted-foreground"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" /> {a.label}: {a.value}
            </span>
          ))}
        </div>
      )}

      {/* Row 1 — Executive KPIs */}
      <EnterpriseKPIRow className="lg:grid-cols-4">
        <EnterpriseStatCard title="Inventory Value" value={formatINR(kpis.inventoryValue)} />
        <EnterpriseStatCard title="SKUs" value={formatNumber(kpis.skuCount)} />
        <EnterpriseStatCard title="On-Hand Units" value={formatNumber(kpis.onHandUnits)} />
        <EnterpriseStatCard title="Available Units" value={formatNumber(kpis.availableUnits)} />
        <EnterpriseStatCard title="Reserved Units" value={formatNumber(kpis.reservedUnits)} />
        <EnterpriseStatCard title="Warehouses" value={formatNumber(kpis.warehouseCount)} />
        <EnterpriseStatCard title="Out of Stock" value={formatNumber(kpis.outOfStock)} variant={kpis.outOfStock > 0 ? "destructive" : "default"} />
        <EnterpriseStatCard title="Low Stock" value={formatNumber(kpis.lowStock)} variant={kpis.lowStock > 0 ? "warning" : "default"} />
      </EnterpriseKPIRow>

      {/* Row 2 — Value by warehouse + warehouse summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StandardBarChart className="lg:col-span-2" title="Inventory value by warehouse" data={d.valueByWarehouse} xAxisKey="warehouse" series={[{ key: "value", color: "var(--primary)" }]} height={240} />
        <ListCard title="Warehouse summary" rows={d.warehouseSummary.map((w) => ({ label: w.warehouse, sub: `${formatNumber(w.units)} units · ${w.skuLines} lines`, value: formatINR(w.value) }))} />
      </div>

      {/* Row 3 — Movers */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListCard title="Fast movers (30d outbound)" rows={d.fastMovers.map((m) => ({ label: m.variant, sub: m.product, value: formatNumber(m.movement) }))} empty="No outbound movement in the last 30 days." />
        <ListCard title="Slow movers (30d outbound)" rows={d.slowMovers.map((m) => ({ label: m.variant, sub: m.product, value: formatNumber(m.movement) }))} empty="No outbound movement in the last 30 days." />
      </div>

      {/* Row 4 — Low stock + recent movements */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListCard
          title="Low / out-of-stock"
          empty="All stock healthy."
          rows={d.lowStock.map((r) => ({ label: r.variant, sub: `${r.product} · ${r.warehouse}`, value: `${formatNumber(r.available)} avail (${r.status === "OUT_OF_STOCK" ? "OUT" : "LOW"})` }))}
        />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Recent movements</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {d.recentMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No movements yet.</p>
            ) : (
              d.recentMovements.map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    {m.quantity >= 0 ? <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 shrink-0 text-destructive" />}
                    <div className="min-w-0">
                      <div className="truncate font-medium">{m.variant} <span className="text-xs font-normal text-muted-foreground">· {m.type}</span></div>
                      <div className="truncate text-xs text-muted-foreground">{m.warehouse} · {m.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div>
                    </div>
                  </div>
                  <span className={`shrink-0 tabular-nums ${m.quantity >= 0 ? "text-emerald-600" : "text-destructive"}`}>{m.quantity >= 0 ? "+" : ""}{formatNumber(m.quantity)} {m.unit}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </EnterprisePage>
  );
}
