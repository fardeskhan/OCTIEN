"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MaintenanceJob } from "@/types"
import { mockJobs } from "@/app/(dashboard)/_data/salam"



export default function MaintenancePage() {
  const columns: ColumnDef<MaintenanceJob>[] = [
    {
      accessorKey: "ticketId",
      header: "Ticket ID",
      cell: ({ row }) => <span className="font-mono text-sm text-primary hover:underline cursor-pointer">{row.getValue("ticketId")}</span>
    },
    {
      accessorKey: "assetId",
      header: "Asset ID",
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("assetId")}</span>
    },
    {
      accessorKey: "storeName",
      header: "Location",
    },
    {
      accessorKey: "issue",
      header: "Reported Issue",
    },
    {
      accessorKey: "reportedOn",
      header: "Reported",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Resolved") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Resolved</Badge>
        if (status === "In Progress") return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>
        return <Badge variant="destructive">Open</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost">Assign Tech</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Asset Maintenance" 
        description="Manage repair tickets and maintenance schedules for physical assets."
        actions={<Button>Create Ticket</Button>}
      />
      
      <FilterBar 
        placeholder="Search tickets..." 
        views={["Open Tickets", "My Assignments", "Resolved"]}
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
