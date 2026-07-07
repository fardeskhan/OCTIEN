"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RouteMapPanel } from "@/components/ui/route-map-panel"

type DeliveryRun = {
  id: string
  date: string
  vehicle: string
  driver: string
  status: "Planned" | "In Progress" | "Completed" | "Delayed"
  stops: number
  completion: number
}

const mockRuns: DeliveryRun[] = [
  { id: "RUN-2026-001", date: "2026-07-06", vehicle: "TRK-05", driver: "John Smith", status: "In Progress", stops: 12, completion: 45 },
  { id: "RUN-2026-002", date: "2026-07-06", vehicle: "TRK-08", driver: "Mike Johnson", status: "Planned", stops: 8, completion: 0 },
  { id: "RUN-2026-003", date: "2026-07-06", vehicle: "TRK-12", driver: "Sarah Lee", status: "Delayed", stops: 15, completion: 20 },
  { id: "RUN-2026-004", date: "2026-07-05", vehicle: "TRK-05", driver: "John Smith", status: "Completed", stops: 10, completion: 100 },
]

export default function RunsPage() {
  const columns: ColumnDef<DeliveryRun>[] = [
    {
      accessorKey: "id",
      header: "Run ID",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("id")}</span>,
    },
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "vehicle",
      header: "Vehicle",
    },
    {
      accessorKey: "driver",
      header: "Driver",
    },
    {
      accessorKey: "stops",
      header: () => <div className="text-right">Stops</div>,
      cell: ({ row }) => <div className="text-right">{row.getValue("stops")}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Completed" ? "default" : status === "Delayed" ? "destructive" : status === "In Progress" ? "secondary" : "outline"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "completion",
      header: "Completion",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
           <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
             <div className="h-full bg-primary" style={{ width: `${row.getValue("completion")}%` }} />
           </div>
           <span className="text-xs">{row.getValue("completion")}%</span>
        </div>
      )
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Delivery Runs" 
        description="Monitor active delivery routes and fleet performance."
        actions={<Button>Plan New Run</Button>}
      />
      
      <FilterBar 
        placeholder="Search runs..." 
        views={["All", "Active Today", "Delayed", "Completed"]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 flex-1 min-h-0">
        <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
           <RouteMapPanel activeRoutes={3} className="flex-1" />
        </div>
        <div className="lg:col-span-2 overflow-hidden flex flex-col">
          <DataTable 
            columns={columns} 
            data={mockRuns} 
          />
        </div>
      </div>
    </WorkspaceLayout>
  )
}
