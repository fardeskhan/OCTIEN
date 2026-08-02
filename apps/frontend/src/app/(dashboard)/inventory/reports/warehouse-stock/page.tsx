export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getWarehouseStockReport } from "@/lib/inventory/inventory-reports";
import { formatINR } from "@/lib/currency";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "warehouse", header: "Warehouse" },
  { key: "product", header: "Product" },
  { key: "variant", header: "Variant" },
  { key: "sku", header: "SKU" },
  { key: "onHand", header: "On Hand", format: "number" },
  { key: "reserved", header: "Reserved", format: "number" },
  { key: "available", header: "Available", format: "number" },
  { key: "avgCost", header: "Avg Cost", format: "money" },
  { key: "value", header: "Value", format: "money" },
  { key: "status", header: "Status", format: "status" },
];

export default async function WarehouseStockReportPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");
  const rows = await getWarehouseStockReport(businessId);
  const totalValue = rows.reduce((s, r) => s + Number(r.value), 0);

  return (
    <EnterpriseReportLayout
      title="Warehouse Stock"
      description="Current stock position by variant and warehouse."
      kpis={[{ label: "Lines", value: String(rows.length) }, { label: "Total Value", value: formatINR(totalValue) }]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search stock…" statusKey="status" />
    </EnterpriseReportLayout>
  );
}
