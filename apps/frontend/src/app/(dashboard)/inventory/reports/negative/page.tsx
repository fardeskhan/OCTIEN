export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getNegativeStockReport } from "@/lib/inventory/inventory-reports";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "product", header: "Product" },
  { key: "variant", header: "Variant" },
  { key: "sku", header: "SKU" },
  { key: "warehouse", header: "Warehouse" },
  { key: "onHand", header: "On Hand", format: "number" },
  { key: "reserved", header: "Reserved", format: "number" },
  { key: "available", header: "Available", format: "number" },
  { key: "status", header: "Status", format: "status" },
];

export default async function NegativeStockReportPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");
  const rows = await getNegativeStockReport(businessId);

  return (
    <EnterpriseReportLayout
      title="Negative Stock"
      description="Data-integrity guard — any line with on-hand or available below zero should be investigated."
      kpis={[{ label: "Negative lines", value: String(rows.length) }]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search…" statusKey="status" />
    </EnterpriseReportLayout>
  );
}
