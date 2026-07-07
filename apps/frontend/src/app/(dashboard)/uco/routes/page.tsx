"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CollectionRouteMap } from "@/components/uco/collection-route-map"
import { Route } from "@/types"
import { mockRoutes } from "@/app/(dashboard)/_data/uco"




export default function RoutesOverviewPage() {
  const columns: ColumnDef<Route>[] = [
    {
      accessorKey: "name",
      header: "Route Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("name")}</span>
    },
    {
      accessorKey: "driver",
      header: "Assigned Driver",
    },
    {
      accessorKey: "stops",
      header: () => <div className="text-right">Stops</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("stops")}</div>
    },
    {
      accessorKey: "collectedKg",
      header: () => <div className="text-right">Collected (KG)</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("collectedKg")}</div>
    },
    {
      accessorKey: "efficiency",
      header: () => <div className="text-right">Efficiency (%)</div>,
      cell: ({ row }) => {
        const eff = row.getValue("efficiency") as number
        return <div className={`text-right font-medium ${eff >= 90 ? "text-emerald-600" : eff >= 70 ? "text-amber-500" : "text-destructive"}`}>{eff}%</div>
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Healthy") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Healthy</Badge>
        if (status === "Delayed") return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Delayed</Badge>
        return <Badge variant="destructive">Critical</Badge>
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Route Management" 
        description="Monitor active collection routes and vehicle telemetry."
        actions={<Button>Optimize Routes</Button>}
      />
      
      <div className="flex gap-4 border-b border-border mt-2">
        <Button variant="ghost" className="rounded-none border-b-2 border-primary rounded-b-sm bg-accent text-accent-foreground font-medium">Active Routes</Button>
        <a href="/uco/routes/stops" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Route Stops</a>
        <a href="/uco/routes/efficiency" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Efficiency Trends</a>
        <a href="/uco/routes/exceptions" className="px-4 py-2 text-sm font-medium text-destructive hover:text-destructive/80">Route Exceptions</a>
      </div>

      <div className="mt-6 mb-6">
        <CollectionRouteMap routes={mockRoutes} />
      </div>

      <FilterBar 
        placeholder="Search routes..." 
        views={["All Routes", "Delayed / Critical", "High Efficiency"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockRoutes} 
        />
      </div>
    </WorkspaceLayout>
  )
}
