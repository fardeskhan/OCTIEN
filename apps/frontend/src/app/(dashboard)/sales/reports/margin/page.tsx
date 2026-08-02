export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getMarginReport } from "@/lib/sales/sales-reports";
import { formatINR } from "@/lib/currency";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "product", header: "Product" },
  { key: "revenue", header: "Revenue", format: "money" },
  { key: "cost", header: "COGS", format: "money" },
  { key: "margin", header: "Margin", format: "money" },
  { key: "marginpct", header: "Margin %", format: "number" },
];

export default async function MarginReportPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");
  const rows = await getMarginReport(businessId);
  const revenue = rows.reduce((s, r) => s + Number(r.revenue), 0);
  const margin = rows.reduce((s, r) => s + Number(r.margin), 0);
  const pct = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;

  return (
    <EnterpriseReportLayout
      title="Margin Report"
      description="Revenue, COGS and margin by product (COGS from product cost)."
      kpis={[
        { label: "Revenue", value: formatINR(revenue) },
        { label: "Margin", value: formatINR(margin) },
        { label: "Margin %", value: `${pct}%` },
      ]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search products…" />
    </EnterpriseReportLayout>
  );
}
