"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Period } from "@/types"
import { mockPeriods } from "@/app/(dashboard)/_data/finance"



export default function OpenPeriodsPage() {
  const columns: ColumnDef<Period>[] = [
    {
      accessorKey: "name",
      header: "Period",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
    },
    {
      accessorKey: "endDate",
      header: "End Date",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Open") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Open</Badge>
        if (status === "Adjusting") return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Adjusting (Soft Close)</Badge>
        return <Badge variant="outline" className="text-muted-foreground">Closed</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <div className="flex justify-end gap-2">
            {status === "Adjusting" && <Button size="sm" variant="outline">Finalize Close</Button>}
            {status === "Closed" && <Button size="sm" variant="ghost">Reopen Period</Button>}
          </div>
        )
      }
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Fiscal Periods" 
        description="Manage accounting periods and locking."
        actions={<Button>Create Next Fiscal Year</Button>}
      />
      
      <FilterBar 
        placeholder="Search periods..." 
        views={["All Open", "Current Year", "All Time"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockPeriods} 
        />
      </div>
    </WorkspaceLayout>
  )
}
