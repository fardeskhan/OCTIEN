export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getSlowMovingReport } from "@/lib/inventory/inventory-reports";
import { formatINR } from "@/lib/currency";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "product", header: "Product" },
  { key: "variant", header: "Variant" },
  { key: "sku", header: "SKU" },
  { key: "onHand", header: "On Hand", format: "number" },
  { key: "value", header: "Value", format: "money" },
  { key: "lastMovement", header: "Last Movement" },
  { key: "daysSinceLastMovement", header: "Days Idle", format: "number" },
];

export default async function SlowMovingReportPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");
  const rows = await getSlowMovingReport(businessId);
  const stuckValue = rows.reduce((s, r) => s + Number(r.value), 0);

  return (
    <EnterpriseReportLayout
      title="Slow-Moving Inventory"
      description="Stock ranked by days since last movement (proxy for aging — no batch-expiry model)."
      kpis={[{ label: "Variants", value: String(rows.length) }, { label: "Value at rest", value: formatINR(stuckValue) }]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search variants…" />
    </EnterpriseReportLayout>
  );
}
