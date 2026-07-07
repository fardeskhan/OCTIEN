"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ComplianceJob } from "@/types"
import { mockJobs } from "@/app/(dashboard)/_data/governance"



export default function ComplianceJobsPage() {
  const columns: ColumnDef<ComplianceJob>[] = [
    {
      accessorKey: "name",
      header: "Job Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>
    },
    {
      accessorKey: "schedule",
      header: "Schedule",
    },
    {
      accessorKey: "lastRun",
      header: "Last Run",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Success") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Success</Badge>
        if (status === "Failed") return <Badge variant="destructive">Failed</Badge>
        return <Badge variant="secondary">Running</Badge>
      }
    },
    {
      accessorKey: "nextRun",
      header: "Next Run",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost">Run Now</Button>
          <Button size="sm" variant="ghost">Logs</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Automated Compliance Jobs" 
        description="Monitor background tasks that enforce compliance rules."
        actions={<Button variant="outline">Schedule New Job</Button>}
      />
      
      <FilterBar 
        placeholder="Search jobs..." 
        views={["All Jobs", "Failing Jobs"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockJobs} 
        />
      </div>
    </WorkspaceLayout>
  )
}
