"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Transfer } from "@/types"
import { mockTransfers } from "@/app/(dashboard)/_data/inventory"



export default function TransfersPage() {
  const columns: ColumnDef<Transfer>[] = [
    {
      accessorKey: "id",
      header: "Transfer ID",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("id")}</span>,
    },
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Completed" ? "default" : status === "In Transit" ? "secondary" : "outline"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "source",
      header: "Source Location",
    },
    {
      accessorKey: "destination",
      header: "Destination Location",
    },
    {
      accessorKey: "items",
      header: () => <div className="text-right">Total Items</div>,
      cell: ({ row }) => <div className="text-right">{row.getValue("items")}</div>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Transfers" 
        description="Manage stock transfers between warehouses and locations."
        actions={<Button>New Transfer</Button>}
      />
      
      <FilterBar 
        placeholder="Search transfers..." 
        views={["All", "Pending", "In Transit", "Completed"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockTransfers} 
        />
      </div>
    </WorkspaceLayout>
  )
}
