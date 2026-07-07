"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type RouteStop = {
  id: string
  runId: string
  sequence: number
  customer: string
  location: string
  status: "Pending" | "Completed" | "Skipped" | "Failed"
  eta: string
}

const mockStops: RouteStop[] = [
  { id: "STP-8832", runId: "RUN-2026-001", sequence: 1, customer: "Acme Corporation", location: "Downtown", status: "Completed", eta: "08:30" },
  { id: "STP-8833", runId: "RUN-2026-001", sequence: 2, customer: "TechStart Inc", location: "North Park", status: "Pending", eta: "10:15" },
  { id: "STP-8834", runId: "RUN-2026-001", sequence: 3, customer: "Global Retailers", location: "Westside", status: "Failed", eta: "12:00" },
]

export default function StopsPage() {
  const columns: ColumnDef<RouteStop>[] = [
    {
      accessorKey: "runId",
      header: "Run ID",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("runId")}</span>,
    },
    {
      accessorKey: "sequence",
      header: "Seq",
    },
    {
      accessorKey: "customer",
      header: "Customer",
    },
    {
      accessorKey: "location",
      header: "Location",
    },
    {
      accessorKey: "eta",
      header: "ETA",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Completed" ? "default" : status === "Failed" || status === "Skipped" ? "destructive" : "secondary"}>
            {status}
          </Badge>
        )
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Delivery Stops" 
        description="Detailed view of individual delivery points and statuses."
      />
      
      <FilterBar 
        placeholder="Search stops..." 
        views={["All", "Pending Today", "Failed/Skipped"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockStops} 
        />
      </div>
    </WorkspaceLayout>
  )
}
