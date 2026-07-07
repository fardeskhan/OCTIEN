"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Receipt } from "@/types"
import { mockReceipts } from "@/app/(dashboard)/_data/procurement"



export default function GoodsReceiptsPage() {
  const columns: ColumnDef<Receipt>[] = [
    {
      accessorKey: "id",
      header: "GRN Number",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("id")}</span>,
    },
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "poNumber",
      header: "PO Reference",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("poNumber")}</span>,
    },
    {
      accessorKey: "supplier",
      header: "Supplier",
    },
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
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: () => (
        <div className="flex justify-end gap-2">
           <Button size="sm" variant="outline">Scan</Button>
           <Button size="sm">Receive</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Goods Receipts" 
        description="Rapid receiving workflow for incoming warehouse deliveries."
        actions={<Button>New Receipt</Button>}
      />
      
      <FilterBar 
        placeholder="Search receipts..." 
        views={["All", "Pending Receiving", "Discrepancies", "Completed"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockReceipts} 
        />
      </div>
    </WorkspaceLayout>
  )
}
