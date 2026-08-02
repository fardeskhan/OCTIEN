export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getShipmentRegister } from "@/lib/sales/sales-reports";
import { EnterpriseReportLayout, EnterpriseReportTable, type ReportColumn } from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "code", header: "Shipment" },
  { key: "date", header: "Date" },
  { key: "so", header: "Sales Order" },
  { key: "customer", header: "Customer" },
  { key: "warehouse", header: "Warehouse" },
  { key: "qty", header: "Shipped Qty", format: "number" },
  { key: "status", header: "Status", format: "status" },
];

export default async function ShipmentRegisterPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");
  const rows = await getShipmentRegister(businessId);

  return (
    <EnterpriseReportLayout
      title="Shipment Register"
      description="All shipments and their fulfilment status."
      kpis={[{ label: "Shipments", value: String(rows.length) }]}
    >
      <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search shipments…" statusKey="status" />
    </EnterpriseReportLayout>
  );
}
