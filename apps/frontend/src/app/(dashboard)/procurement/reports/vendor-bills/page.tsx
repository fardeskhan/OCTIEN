export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getVendorBillRegister } from "@/lib/procurement/procurement-reports";
import { formatINR } from "@/lib/currency";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "code", header: "Bill" },
  { key: "date", header: "Date" },
  { key: "supplier", header: "Supplier" },
  { key: "total", header: "Total", format: "money" },
  { key: "paid", header: "Paid", format: "money" },
  { key: "remaining", header: "Balance", format: "money" },
  { key: "status", header: "Status", format: "status" },
];

export default async function VendorBillRegisterPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");
  const rows = await getVendorBillRegister(businessId);
  const billed = rows.reduce((s, r) => s + Number(r.total), 0);
  const outstanding = rows.reduce((s, r) => s + Number(r.remaining), 0);

  return (
    <EnterpriseReportLayout
      title="Vendor Bill Register"
      description="All supplier bills."
      kpis={[{ label: "Bills", value: String(rows.length) }, { label: "Billed", value: formatINR(billed) }, { label: "Outstanding", value: formatINR(outstanding) }]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search bills…" statusKey="status" />
    </EnterpriseReportLayout>
  );
}
