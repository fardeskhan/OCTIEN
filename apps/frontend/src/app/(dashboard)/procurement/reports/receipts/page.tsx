export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getGoodsReceiptRegister } from "@/lib/procurement/procurement-reports";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "code", header: "Receipt" },
  { key: "date", header: "Received" },
  { key: "po", header: "Purchase Order" },
  { key: "supplier", header: "Supplier" },
  { key: "status", header: "Status", format: "status" },
];

export default async function GoodsReceiptRegisterPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");
  const rows = await getGoodsReceiptRegister(businessId);

  return (
    <EnterpriseReportLayout title="Goods Receipt Register" description="All goods receipts." kpis={[{ label: "Receipts", value: String(rows.length) }]}>
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search receipts…" statusKey="status" />
    </EnterpriseReportLayout>
  );
}
