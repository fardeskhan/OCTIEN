export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getProductSales } from "@/lib/sales/sales-reports";
import { formatINR } from "@/lib/currency";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "product", header: "Product" },
  { key: "qty", header: "Qty Sold", format: "number" },
  { key: "amount", header: "Revenue", format: "money" },
];

export default async function ProductSalesPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");
  const rows = await getProductSales(businessId);
  const revenue = rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <EnterpriseReportLayout
      title="Product Sales"
      description="Quantity and revenue by product."
      kpis={[
        { label: "Products", value: String(rows.length) },
        { label: "Revenue", value: formatINR(revenue) },
      ]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search products…" />
    </EnterpriseReportLayout>
  );
}
