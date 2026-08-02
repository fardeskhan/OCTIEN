export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getPaymentRegister } from "@/lib/sales/sales-reports";
import { formatINR } from "@/lib/currency";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "date", header: "Date" },
  { key: "reference", header: "Reference" },
  { key: "customer", header: "Customer" },
  { key: "method", header: "Method", format: "status" },
  { key: "amount", header: "Amount", format: "money" },
];

export default async function PaymentRegisterPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");
  const rows = await getPaymentRegister(businessId);
  const received = rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <EnterpriseReportLayout
      title="Payment Register"
      description="All customer receipts."
      kpis={[
        { label: "Payments", value: String(rows.length) },
        { label: "Total Received", value: formatINR(received) },
      ]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search payments…" statusKey="method" />
    </EnterpriseReportLayout>
  );
}
