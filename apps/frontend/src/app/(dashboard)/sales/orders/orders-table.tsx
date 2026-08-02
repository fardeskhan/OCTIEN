"use client"
import Link from "next/link"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { EnterpriseStatusBadge } from "@/components/enterprise"
import { SalesOrder } from "@/types"
import { formatINR } from "@/lib/currency"

export type SalesOrderRow = SalesOrder & { href: string }

export function SalesOrdersTable({ data }: { data: SalesOrderRow[] }) {
  const columns: ColumnDef<SalesOrderRow>[] = [
    {
      accessorKey: "id",
      header: "Order ID",
      cell: ({ row }) => (
        <Link href={row.original.href} className="font-medium text-primary hover:underline">
          {row.getValue("id")}
        </Link>
      ),
    },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "customer", header: "Customer" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <EnterpriseStatusBadge status={row.getValue("status") as string} />,
    },
    {
      accessorKey: "total",
      header: () => <div className="text-right">Total Amount</div>,
      cell: ({ row }) => <div className="text-right font-medium">{formatINR(row.getValue("total") as number)}</div>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Sales Orders"
        description="Manage order pipeline and fulfillment tracking."
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable columns={columns} data={data} searchPlaceholder="Search orders…" statusKey="status" />
      </div>
    </WorkspaceLayout>
  )
}
