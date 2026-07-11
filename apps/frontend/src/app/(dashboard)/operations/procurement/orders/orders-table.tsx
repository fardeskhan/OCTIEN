"use client"
import Link from "next/link"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PurchaseOrder } from "@/types"
import { formatINR } from "@/lib/currency"

export function PurchaseOrdersTable({ data }: { data: PurchaseOrder[] }) {
  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: "id",
      header: "PO Number",
      cell: ({ row }) => <span className="font-medium text-primary">{row.getValue("id")}</span>,
    },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "supplier", header: "Supplier" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Received" ? "default" : status === "Cancelled" ? "destructive" : status === "Draft" ? "outline" : "secondary"}>
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
        title="Purchase Orders"
        description="Manage supplier orders and procurement pipeline."
        actions={<Link href="/operations/procurement/orders/new" className={buttonVariants()}>Create PO</Link>}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable columns={columns} data={data} searchPlaceholder="Search orders…" statusKey="status" />
      </div>
    </WorkspaceLayout>
  )
}
