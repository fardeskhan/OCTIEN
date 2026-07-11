"use client"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SalesOrder } from "@/types"
import { formatINR } from "@/lib/currency"

export function SalesOrdersTable({ data }: { data: SalesOrder[] }) {
  const columns: ColumnDef<SalesOrder>[] = [
    {
      accessorKey: "id",
      header: "Order ID",
      cell: ({ row }) => <span className="font-medium text-primary">{row.getValue("id")}</span>,
    },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "customer", header: "Customer" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Delivered" ? "default" : status === "Cancelled" ? "destructive" : status === "Draft" ? "outline" : "secondary"}>
            {status}
          </Badge>
        )
      }
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
