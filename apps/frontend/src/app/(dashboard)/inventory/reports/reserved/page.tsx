export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getReservedStockReport } from "@/lib/inventory/inventory-reports";
import { formatNumber } from "@/lib/utils";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "product", header: "Product" },
  { key: "variant", header: "Variant" },
  { key: "sku", header: "SKU" },
  { key: "warehouse", header: "Warehouse" },
  { key: "onHand", header: "On Hand", format: "number" },
  { key: "reserved", header: "Reserved", format: "number" },
  { key: "available", header: "Available", format: "number" },
];

export default async function ReservedStockReportPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");
  const rows = await getReservedStockReport(businessId);
  const totalReserved = rows.reduce((s, r) => s + Number(r.reserved), 0);

  return (
    <EnterpriseReportLayout
      title="Reserved Stock"
      description="Lines currently holding an active reservation."
      kpis={[{ label: "Lines", value: String(rows.length) }, { label: "Units reserved", value: formatNumber(totalReserved) }]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search reserved stock…" />
    </EnterpriseReportLayout>
  );
}
