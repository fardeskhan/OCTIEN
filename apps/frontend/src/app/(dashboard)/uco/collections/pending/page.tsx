"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Collection } from "@/types"
import { mockPendingCollections } from "@/app/(dashboard)/_data/uco"

import { Badge } from "@/components/ui/badge"



export default function PendingCollectionsPage() {
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
      accessorKey: "scheduledTime",
      header: "ETA",
    },
    {
      accessorKey: "expectedVolume",
      header: () => <div className="text-right">Expected (KG)</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("expectedVolume")}</div>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "En Route") return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">En Route</Badge>
        return <Badge variant="outline">Pending</Badge>
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Pending Collections" 
        description="Today's active collections queue."
        actions={<Button>Dispatch Ad-hoc</Button>}
      />
      
      <div className="flex gap-4 border-b border-border mt-2">
        <Button variant="ghost" className="rounded-none border-b-2 border-primary rounded-b-sm bg-accent text-accent-foreground font-medium">Pending</Button>
        <a href="/uco/collections/scheduled" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Scheduled</a>
        <a href="/uco/collections/completed" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Completed</a>
        <a href="/uco/collections/missed" className="px-4 py-2 text-sm font-medium text-destructive hover:text-destructive/80">Missed Exceptions</a>
      </div>

      <FilterBar 
        placeholder="Search pending..." 
        views={["All Pending", "Delayed ETA"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockPendingCollections} 
        />
      </div>
    </WorkspaceLayout>
  )
}
