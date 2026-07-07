"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RouteException } from "@/types"
import { mockExceptions } from "@/app/(dashboard)/_data/uco"




export default function RouteExceptionsPage() {
  const columns: ColumnDef<RouteException>[] = [
    {
      accessorKey: "route",
      header: "Route",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("route")}</span>
    },
    {
      accessorKey: "driver",
      header: "Driver",
    },
    {
      accessorKey: "exceptionType",
      header: "Exception Type",
      cell: ({ row }) => <span className="text-amber-600 dark:text-amber-500 font-medium">{row.getValue("exceptionType")}</span>
    },
    {
      accessorKey: "timeLogged",
      header: "Time",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Resolved") return <Badge variant="outline" className="text-muted-foreground">Resolved</Badge>
        return <Badge variant="destructive">Open</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Open") return <Button size="sm" variant="secondary">Resolve</Button>
        return null
      }
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Route Exceptions" 
        description="Active incidents, delays, and vehicle issues affecting routes."
      />
      
      <div className="flex gap-4 border-b border-border mt-2">
        <a href="/uco/routes" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Active Routes</a>
        <a href="/uco/routes/stops" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Route Stops</a>
        <a href="/uco/routes/efficiency" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Efficiency Trends</a>
        <Button variant="ghost" className="rounded-none border-b-2 border-destructive text-destructive font-medium bg-destructive/10 hover:bg-destructive/10 hover:text-destructive">Route Exceptions</Button>
      </div>

      <FilterBar 
        placeholder="Search exceptions..." 
        views={["Unresolved", "Vehicle Breakdowns"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockExceptions} 
        />
      </div>
    </WorkspaceLayout>
  )
}
