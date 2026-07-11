"use client"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Receipt } from "@/types"

export function GoodsReceiptsTable({ data }: { data: Receipt[] }) {
  const columns: ColumnDef<Receipt>[] = [
    {
      accessorKey: "id",
      header: "GRN Number",
      cell: ({ row }) => <span className="font-medium text-primary">{row.getValue("id")}</span>,
    },
    { accessorKey: "date", header: "Date" },
    {
      accessorKey: "poNumber",
      header: "PO Reference",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("poNumber")}</span>,
    },
    { accessorKey: "supplier", header: "Supplier" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Completed" ? "default" : status === "Discrepancy" ? "destructive" : "warning"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "items",
      header: () => <div className="text-right">Lines Received</div>,
      cell: ({ row }) => <div className="text-right">{row.getValue("items")}</div>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Goods Receipts"
        description="Receiving workflow for incoming warehouse deliveries."
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable columns={columns} data={data} searchPlaceholder="Search receipts…" statusKey="status" />
      </div>
    </WorkspaceLayout>
  )
}
