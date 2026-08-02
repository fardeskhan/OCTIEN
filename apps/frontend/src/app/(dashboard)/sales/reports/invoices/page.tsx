export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getInvoiceRegister } from "@/lib/sales/sales-reports";
import { formatINR } from "@/lib/currency";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "code", header: "Invoice" },
  { key: "date", header: "Date" },
  { key: "customer", header: "Customer" },
  { key: "total", header: "Total", format: "money" },
  { key: "paid", header: "Paid", format: "money" },
  { key: "remaining", header: "Balance", format: "money" },
  { key: "status", header: "Status", format: "status" },
];

export default async function InvoiceRegisterPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");
  const rows = await getInvoiceRegister(businessId);
  const invoiced = rows.reduce((s, r) => s + Number(r.total), 0);
  const outstanding = rows.reduce((s, r) => s + Number(r.remaining), 0);

  return (
    <EnterpriseReportLayout
      title="Invoice Register"
      description="All customer invoices."
      kpis={[
        { label: "Invoices", value: String(rows.length) },
        { label: "Invoiced", value: formatINR(invoiced) },
        { label: "Outstanding", value: formatINR(outstanding) },
      ]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search invoices…" statusKey="status" />
    </EnterpriseReportLayout>
  );
}
