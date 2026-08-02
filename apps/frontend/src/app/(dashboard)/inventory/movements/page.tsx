export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getStockMovementRegister } from "@/lib/inventory/inventory-reports";
import { formatNumber } from "@/lib/utils";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const NAV = [
  ["Overview", "/inventory/dashboard"],
  ["Stock Ledger", "/inventory/stock-ledger"],
  ["Valuation", "/inventory/valuation"],
  ["Movements", "/inventory/movements"],
  ["Reports", "/inventory/reports"],
] as const;

const COLUMNS: ReportColumn[] = [
  { key: "date", header: "Date" },
  { key: "type", header: "Type", format: "status" },
  { key: "product", header: "Product" },
  { key: "variant", header: "Variant" },
  { key: "warehouse", header: "Warehouse" },
  { key: "quantity", header: "Quantity", format: "number" },
  { key: "reference", header: "Reference" },
  { key: "actor", header: "Actor" },
];

export default async function InventoryMovementsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");

  const rows = await getStockMovementRegister(businessId, { limit: 1000 });
  const unitsIn = rows.filter((r) => r.quantity > 0).reduce((s, r) => s + r.quantity, 0);
  const unitsOut = rows.filter((r) => r.quantity < 0).reduce((s, r) => s + Math.abs(r.quantity), 0);

  return (
    <EnterpriseReportLayout
      title="Movement Register"
      description="Every stock movement — receipts, dispatches, transfers, adjustments and returns."
      kpis={[
        { label: "Movements", value: String(rows.length) },
        { label: "Units In", value: `+${formatNumber(unitsIn)}` },
        { label: "Units Out", value: `-${formatNumber(unitsOut)}` },
      ]}
      actions={
        <div className="flex flex-wrap gap-4 text-sm font-medium">
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} className={href === "/inventory/movements" ? "text-primary" : "text-muted-foreground hover:text-foreground"}>{label}</Link>
          ))}
        </div>
      }
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search movements…" statusKey="type" />
    </EnterpriseReportLayout>
  );
}
