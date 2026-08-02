export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getInventoryValuation } from "@/lib/inventory/inventory-valuation";
import { formatINR } from "@/lib/currency";
import { formatNumber } from "@/lib/utils";
import { StandardBarChart } from "@/components/ui/chart-wrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EnterprisePage,
  EnterprisePageHeader,
  EnterpriseKPIRow,
  EnterpriseStatCard,
  EnterpriseReportTable,
  type ReportColumn,
} from "@/components/enterprise";

const NAV = [
  ["Overview", "/inventory/dashboard"],
  ["Stock Ledger", "/inventory/stock-ledger"],
  ["Valuation", "/inventory/valuation"],
  ["Movements", "/inventory/movements"],
  ["Reports", "/inventory/reports"],
] as const;

const VARIANT_COLUMNS: ReportColumn[] = [
  { key: "product", header: "Product" },
  { key: "variant", header: "Variant" },
  { key: "sku", header: "SKU" },
  { key: "onHand", header: "On Hand", format: "number" },
  { key: "avgCost", header: "Avg Cost", format: "money" },
  { key: "value", header: "Value", format: "money" },
  { key: "abc", header: "ABC", format: "status" },
];

export default async function InventoryValuationPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");

  const val = await getInventoryValuation(businessId);

  // ABC classification by cumulative value contribution (A ≤ 80%, B ≤ 95%, C rest).
  // Purely functional (no outer-scope mutation) — byVariant is already sorted value-descending.
  const variantRows = val.byVariant.map((v, i) => {
    const cumulative = val.byVariant.slice(0, i + 1).reduce((s, x) => s + x.value, 0);
    const pct = val.totalValue > 0 ? cumulative / val.totalValue : 0;
    const abc = pct <= 0.8 ? "A" : pct <= 0.95 ? "B" : "C";
    return { product: v.product, variant: v.variant, sku: v.sku, onHand: v.onHand, avgCost: v.averageCost, value: v.value, abc };
  });
  const abcCounts = { A: variantRows.filter((r) => r.abc === "A").length, B: variantRows.filter((r) => r.abc === "B").length, C: variantRows.filter((r) => r.abc === "C").length };

  return (
    <EnterprisePage>
      <EnterprisePageHeader title="Inventory Valuation" description="On-hand stock valued at moving average cost." />

      <div className="flex flex-wrap gap-4 border-b border-border pb-3 text-sm font-medium">
        {NAV.map(([label, href]) => (
          <Link key={href} href={href} className={href === "/inventory/valuation" ? "text-primary" : "text-muted-foreground hover:text-foreground"}>{label}</Link>
        ))}
      </div>

      <EnterpriseKPIRow className="lg:grid-cols-5">
        <EnterpriseStatCard title="Total Inventory Value" value={formatINR(val.totalValue)} />
        <EnterpriseStatCard title="Total Units" value={formatNumber(val.totalUnits)} />
        <EnterpriseStatCard title="Variants" value={formatNumber(val.variantCount)} />
        <EnterpriseStatCard title="Warehouses" value={formatNumber(val.warehouseCount)} />
        <EnterpriseStatCard title="ABC (A/B/C)" value={`${abcCounts.A} / ${abcCounts.B} / ${abcCounts.C}`} />
      </EnterpriseKPIRow>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StandardBarChart className="lg:col-span-2" title="Value by warehouse" data={val.byWarehouse} xAxisKey="warehouse" series={[{ key: "value", color: "var(--primary)" }]} height={240} />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Warehouse valuation</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {val.byWarehouse.map((w) => (
              <div key={w.warehouseId} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{w.warehouse}</div>
                  <div className="text-xs text-muted-foreground">{formatNumber(w.units)} units · {w.lines} lines</div>
                </div>
                <span className="shrink-0 tabular-nums">{formatINR(w.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <EnterpriseReportTable columns={VARIANT_COLUMNS} data={variantRows} searchPlaceholder="Search variants…" statusKey="abc" />
    </EnterprisePage>
  );
}
