export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getInventoryDashboard } from "@/lib/inventory/inventory-dashboard";
import { formatINR } from "@/lib/currency";
import { formatNumber } from "@/lib/utils";
import { StandardBarChart } from "@/components/ui/chart-wrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnterprisePage, EnterprisePageHeader, EnterpriseKPIRow, EnterpriseStatCard, EnterprisePrintButton } from "@/components/enterprise";

export default async function InventorySummaryPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");
  const d = await getInventoryDashboard(businessId);

  return (
    <EnterprisePage>
      <EnterprisePageHeader
        title="Inventory Summary"
        description="Executive overview of stock position and valuation."
        actions={<EnterprisePrintButton />}
      />

      <EnterpriseKPIRow className="lg:grid-cols-4">
        <EnterpriseStatCard title="Inventory Value" value={formatINR(d.kpis.inventoryValue)} />
        <EnterpriseStatCard title="SKUs" value={formatNumber(d.kpis.skuCount)} />
        <EnterpriseStatCard title="On-Hand Units" value={formatNumber(d.kpis.onHandUnits)} />
        <EnterpriseStatCard title="Reserved Units" value={formatNumber(d.kpis.reservedUnits)} />
        <EnterpriseStatCard title="Warehouses" value={formatNumber(d.kpis.warehouseCount)} />
        <EnterpriseStatCard title="Available Units" value={formatNumber(d.kpis.availableUnits)} />
        <EnterpriseStatCard title="Out of Stock" value={formatNumber(d.kpis.outOfStock)} variant={d.kpis.outOfStock > 0 ? "destructive" : "default"} />
        <EnterpriseStatCard title="Low Stock" value={formatNumber(d.kpis.lowStock)} variant={d.kpis.lowStock > 0 ? "warning" : "default"} />
      </EnterpriseKPIRow>

      <StandardBarChart title="Inventory value by warehouse" data={d.valueByWarehouse} xAxisKey="warehouse" series={[{ key: "value", color: "var(--primary)" }]} height={240} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Warehouse summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {d.warehouseSummary.map((w) => (
              <div key={w.warehouse} className="flex items-center justify-between">
                <span className="font-medium">{w.warehouse}</span>
                <span className="tabular-nums text-muted-foreground">{formatNumber(w.units)} units · {formatINR(w.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Fast movers (30d)</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {d.fastMovers.length === 0 ? <p className="text-muted-foreground">No outbound movement.</p> : d.fastMovers.map((m) => (
              <div key={m.variant} className="flex items-center justify-between">
                <span className="truncate pr-2 font-medium">{m.variant}</span>
                <span className="tabular-nums text-muted-foreground">{formatNumber(m.movement)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </EnterprisePage>
  );
}
