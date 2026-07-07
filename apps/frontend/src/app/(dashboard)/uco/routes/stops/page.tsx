"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RouteStop } from "@/types"
import { mockStops } from "@/app/(dashboard)/_data/uco"




export default function RouteStopsPage() {
  const columns: ColumnDef<RouteStop>[] = [
    {
      accessorKey: "sequence",
      header: "Seq",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("sequence")}</span>
    },
    {
      accessorKey: "route",
      header: "Route",
    },
    {
      accessorKey: "source",
      header: "Stop Location",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("source")}</span>
    },
    {
      accessorKey: "eta",
      header: "Scheduled ETA",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Completed") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Completed</Badge>
        if (status === "Skipped") return <Badge variant="destructive">Skipped</Badge>
        return <Badge variant="outline">Pending</Badge>
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Route Stops" 
        description="Detailed stop-by-stop sequencing and execution tracking."
      />
      
      <div className="flex gap-4 border-b border-border mt-2">
        <a href="/uco/routes" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Active Routes</a>
        <Button variant="ghost" className="rounded-none border-b-2 border-primary rounded-b-sm bg-accent text-accent-foreground font-medium">Route Stops</Button>
        <a href="/uco/routes/efficiency" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Efficiency Trends</a>
        <a href="/uco/routes/exceptions" className="px-4 py-2 text-sm font-medium text-destructive hover:text-destructive/80">Route Exceptions</a>
      </div>

      <FilterBar 
        placeholder="Search stops..." 
        views={["Upcoming Stops", "Skipped Stops"]}
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
