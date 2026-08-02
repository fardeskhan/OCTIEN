export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getCustomerSales } from "@/lib/sales/sales-reports";
import { formatINR } from "@/lib/currency";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "customer", header: "Customer" },
  { key: "invoices", header: "Invoices", format: "number" },
  { key: "invoiced", header: "Invoiced", format: "money" },
  { key: "received", header: "Received", format: "money" },
  { key: "outstanding", header: "Outstanding", format: "money" },
];

export default async function CustomerSalesPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");
  const rows = await getCustomerSales(businessId);
  const invoiced = rows.reduce((s, r) => s + Number(r.invoiced), 0);
  const outstanding = rows.reduce((s, r) => s + Number(r.outstanding), 0);

  return (
    <EnterpriseReportLayout
      title="Customer Sales"
      description="Invoiced, received and outstanding by customer."
      kpis={[
        { label: "Customers", value: String(rows.length) },
        { label: "Invoiced", value: formatINR(invoiced) },
        { label: "Outstanding", value: formatINR(outstanding) },
      ]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search customers…" />
    </EnterpriseReportLayout>
  );
}
