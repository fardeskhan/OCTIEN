export const dynamic = "force-dynamic";

import { Truck } from "lucide-react";
import { getShipments } from "@/app/actions/fulfillment";
import {
  EnterprisePage,
  EnterprisePageHeader,
  EnterpriseKPIRow,
  EnterpriseStatCard,
  EnterpriseEmptyState,
} from "@/components/enterprise";
import { DeliveriesTable, type DeliveryRow } from "./deliveries-table";

function fmtDate(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export default async function DeliveriesPage() {
  const shipments = await getShipments();

  const count = (s: string) => shipments.filter((sh) => sh.status === s).length;

  const rows: DeliveryRow[] = shipments.map((sh) => ({
    id: sh.id,
    code: sh.code,
    soCode: sh.salesOrder?.code ?? "—",
    customer: sh.salesOrder?.customer?.name ?? "—",
    warehouse: sh.warehouse?.name ?? "—",
    status: sh.status,
    totalQty: sh.lines.reduce((t, l) => t + l.requestedQty, 0),
    created: fmtDate(sh.createdAt),
    dispatched: sh.status === "DISPATCHED" || sh.status === "DELIVERED" ? fmtDate(sh.updatedAt) : "—",
    delivered: fmtDate(sh.receivedAt),
    href: `/sales/deliveries/${sh.id}`,
  }));

  return (
    <EnterprisePage>
      <EnterprisePageHeader
        title="Deliveries"
        description="Shipments and delivery fulfilment across your sales orders."
      />

      <EnterpriseKPIRow className="lg:grid-cols-5">
        <EnterpriseStatCard title="Draft" value={count("DRAFT")} />
        <EnterpriseStatCard title="Picking" value={count("PICKING")} />
        <EnterpriseStatCard title="Packing" value={count("PACKING")} />
        <EnterpriseStatCard title="Dispatched" value={count("DISPATCHED")} />
        <EnterpriseStatCard title="Delivered" value={count("DELIVERED")} />
      </EnterpriseKPIRow>

      {rows.length === 0 ? (
        <EnterpriseEmptyState
          icon={<Truck className="h-5 w-5" />}
          title="No shipments yet"
          description="Create a delivery from a confirmed sales order to start fulfilment."
        />
      ) : (
        <div className="flex-1 overflow-hidden">
          <DeliveriesTable data={rows} />
        </div>
      )}
    </EnterprisePage>
  );
}
