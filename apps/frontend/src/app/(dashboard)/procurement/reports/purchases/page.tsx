export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getPurchaseRegister } from "@/lib/procurement/procurement-reports";
import { formatINR } from "@/lib/currency";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "code", header: "PO" },
  { key: "date", header: "Date" },
  { key: "supplier", header: "Supplier" },
  { key: "total", header: "Total", format: "money" },
  { key: "status", header: "Status", format: "status" },
];

export default async function PurchaseRegisterPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");
  const rows = await getPurchaseRegister(businessId);
  const total = rows.reduce((s, r) => s + Number(r.total), 0);

  return (
    <EnterpriseReportLayout
      title="Purchase Register"
      description="All purchase orders."
      kpis={[{ label: "Orders", value: String(rows.length) }, { label: "Value", value: formatINR(total) }]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search purchase orders…" statusKey="status" />
    </EnterpriseReportLayout>
  );
}
