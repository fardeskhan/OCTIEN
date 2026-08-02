export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getInventoryValuationReport } from "@/lib/inventory/inventory-reports";
import { formatINR } from "@/lib/currency";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "product", header: "Product" },
  { key: "variant", header: "Variant" },
  { key: "sku", header: "SKU" },
  { key: "onHand", header: "On Hand", format: "number" },
  { key: "avgCost", header: "Avg Cost", format: "money" },
  { key: "value", header: "Value", format: "money" },
];

export default async function ValuationReportPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");
  const rows = await getInventoryValuationReport(businessId);
  const totalValue = rows.reduce((s, r) => s + Number(r.value), 0);

  return (
    <EnterpriseReportLayout
      title="Inventory Valuation"
      description="Stock value per variant at moving average cost."
      kpis={[{ label: "Variants", value: String(rows.length) }, { label: "Total Value", value: formatINR(totalValue) }]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search variants…" />
    </EnterpriseReportLayout>
  );
}
