export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getFastMovingReport } from "@/lib/inventory/inventory-reports";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "product", header: "Product" },
  { key: "variant", header: "Variant" },
  { key: "sku", header: "SKU" },
  { key: "outboundUnits", header: "Outbound (30d)", format: "number" },
  { key: "movements", header: "Movements", format: "number" },
];

export default async function FastMovingReportPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");
  const rows = await getFastMovingReport(businessId);
  const totalOut = rows.reduce((s, r) => s + Number(r.outboundUnits), 0);

  return (
    <EnterpriseReportLayout
      title="Fast-Moving Inventory"
      description="Stock ranked by outbound volume over the last 30 days."
      kpis={[{ label: "Variants", value: String(rows.length) }, { label: "Units shipped (30d)", value: totalOut.toLocaleString("en-IN") }]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search variants…" />
    </EnterpriseReportLayout>
  );
}
