export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getVendorPaymentRegister } from "@/lib/procurement/procurement-reports";
import { formatINR } from "@/lib/currency";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "date", header: "Date" },
  { key: "reference", header: "Reference" },
  { key: "bill", header: "Bill" },
  { key: "supplier", header: "Supplier" },
  { key: "method", header: "Method", format: "status" },
  { key: "amount", header: "Amount", format: "money" },
];

export default async function VendorPaymentRegisterPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");
  const rows = await getVendorPaymentRegister(businessId);
  const paid = rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <EnterpriseReportLayout
      title="Vendor Payment Register"
      description="All supplier payments."
      kpis={[{ label: "Payments", value: String(rows.length) }, { label: "Total Paid", value: formatINR(paid) }]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search payments…" statusKey="method" />
    </EnterpriseReportLayout>
  );
}
