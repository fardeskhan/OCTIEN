"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Adjustment } from "@/types"
import { mockAdjustments } from "@/app/(dashboard)/_data/inventory"



export default function AdjustmentsPage() {
  const columns: ColumnDef<Adjustment>[] = [
    {
      accessorKey: "id",
      header: "Adjustment ID",
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
          <Badge variant={status === "Approved" ? "default" : status === "Pending" ? "secondary" : "destructive"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "location",
      header: "Location",
    },
    {
      accessorKey: "reason",
      header: "Reason Code",
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Value Impact</div>,
      cell: ({ row }) => {
        const amount = row.getValue("amount") as number
        return (
          <div className={`text-right font-medium ${amount > 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
            {amount > 0 ? "+" : ""}${Math.abs(amount).toFixed(2)}
          </div>
        )
      },
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Stock Adjustments" 
        description="Review and approve inventory quantity and value adjustments."
        actions={<Button>New Adjustment</Button>}
      />
      
      <FilterBar 
        placeholder="Search adjustments..." 
        views={["All", "Pending Approval", "Approved"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockAdjustments} 
        />
      </div>
    </WorkspaceLayout>
  )
}
