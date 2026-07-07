"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { CloseHistory } from "@/types"
import { mockHistory } from "@/app/(dashboard)/_data/finance"



export default function CloseHistoryPage() {
  const columns: ColumnDef<CloseHistory>[] = [
    {
      accessorKey: "period",
      header: "Period",
      cell: ({ row }) => <span className="font-medium">{row.getValue("period")}</span>,
    },
    {
      accessorKey: "closedBy",
      header: "Closed By",
    },
    {
      accessorKey: "closedAt",
      header: "Date Closed",
    },
    {
      accessorKey: "durationDays",
      header: () => <div className="text-right">Close Duration (Days)</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("durationDays")}</div>,
    },
    {
      accessorKey: "adjustments",
      header: () => <div className="text-right">Post-Close Adjustments</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("adjustments")}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <div className="flex justify-end">
            <Button size="sm" variant="ghost">View Audit Log</Button>
          </div>
        )
      }
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Close History" 
        description="Audit log of historical period closes and duration metrics."
        actions={<Button variant="outline">Export Report</Button>}
      />
      
      <FilterBar 
        placeholder="Search history..." 
        views={["2026", "2025", "All Time"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockHistory} 
        />
      </div>
    </WorkspaceLayout>
  )
}
