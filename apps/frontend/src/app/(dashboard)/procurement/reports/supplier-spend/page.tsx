export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getSupplierSpend } from "@/lib/procurement/procurement-reports";
import { formatINR } from "@/lib/currency";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "supplier", header: "Supplier" },
  { key: "bills", header: "Bills", format: "number" },
  { key: "billed", header: "Billed", format: "money" },
  { key: "paid", header: "Paid", format: "money" },
  { key: "outstanding", header: "Outstanding", format: "money" },
];

export default async function SupplierSpendPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");
  const rows = await getSupplierSpend(businessId);
  const billed = rows.reduce((s, r) => s + Number(r.billed), 0);
  const outstanding = rows.reduce((s, r) => s + Number(r.outstanding), 0);

  return (
    <EnterpriseReportLayout
      title="Supplier Spend"
      description="Billed, paid and outstanding by supplier."
      kpis={[{ label: "Suppliers", value: String(rows.length) }, { label: "Billed", value: formatINR(billed) }, { label: "Outstanding", value: formatINR(outstanding) }]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search suppliers…" />
    </EnterpriseReportLayout>
  );
}
