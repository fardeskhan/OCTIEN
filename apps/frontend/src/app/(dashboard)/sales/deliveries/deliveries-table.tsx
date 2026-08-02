"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { EnterpriseDataTable, EnterpriseStatusBadge } from "@/components/enterprise";

export interface DeliveryRow {
  id: string;
  code: string;
  soCode: string;
  customer: string;
  warehouse: string;
  status: string;
  totalQty: number;
  created: string;
  dispatched: string;
  delivered: string;
  href: string;
  [key: string]: string | number;
}

export function DeliveriesTable({ data }: { data: DeliveryRow[] }) {
  const columns: ColumnDef<DeliveryRow>[] = [
    {
      accessorKey: "code",
      header: "Shipment No.",
      cell: ({ row }) => (
        <Link href={row.original.href} className="font-medium text-primary hover:underline">
          {row.getValue("code")}
        </Link>
      ),
    },
    { accessorKey: "soCode", header: "Sales Order" },
    { accessorKey: "customer", header: "Customer" },
    { accessorKey: "warehouse", header: "Warehouse" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <EnterpriseStatusBadge status={row.getValue("status") as string} />,
    },
    {
      accessorKey: "totalQty",
      header: () => <div className="text-right">Total Qty</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("totalQty") as number}</div>,
    },
    { accessorKey: "dispatched", header: "Dispatch Date" },
    { accessorKey: "delivered", header: "Delivery Date" },
  ];

  return <EnterpriseDataTable columns={columns} data={data} searchPlaceholder="Search shipments…" statusKey="status" />;
}
