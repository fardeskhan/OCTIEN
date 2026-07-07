"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Collection } from "@/types"
import { mockCompletedCollections } from "@/app/(dashboard)/_data/uco"




export default function CompletedCollectionsPage() {
  const columns: ColumnDef<Collection>[] = [
    {
      accessorKey: "id",
      header: "Collection ID",
      cell: ({ row }) => <span className="font-mono text-sm text-primary hover:underline cursor-pointer">{row.getValue("id")}</span>
    },
    {
      accessorKey: "source",
      header: "Source",
    },
    {
      accessorKey: "route",
      header: "Route",
    },
    {
      accessorKey: "driver",
      header: "Driver",
    },
    {
      accessorKey: "collectedTime",
      header: "Timestamp",
    },
    {
      accessorKey: "collectedVolume",
      header: () => <div className="text-right">Collected (KG)</div>,
      cell: ({ row }) => <div className="text-right tabular-nums text-emerald-600 font-medium">{row.getValue("collectedVolume")}</div>
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Completed Collections" 
        description="Historical log of successfully collected UCO."
        actions={<Button variant="outline">Export Report</Button>}
      />
      
      <div className="flex gap-4 border-b border-border mt-2">
        <a href="/uco/collections/pending" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Pending</a>
        <a href="/uco/collections/scheduled" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Scheduled</a>
        <Button variant="ghost" className="rounded-none border-b-2 border-primary rounded-b-sm bg-accent text-accent-foreground font-medium">Completed</Button>
        <a href="/uco/collections/missed" className="px-4 py-2 text-sm font-medium text-destructive hover:text-destructive/80">Missed Exceptions</a>
      </div>

      <FilterBar 
        placeholder="Search completed..." 
        views={["Today", "This Week", "High Volume (>100KG)"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockCompletedCollections} 
        />
      </div>
    </WorkspaceLayout>
  )
}
