"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { Collection } from "@/types"
import { mockMissedCollections } from "@/app/(dashboard)/_data/uco"

export default function MissedCollectionsPage() {
  const columns: ColumnDef<Collection>[] = [
    {
      accessorKey: "id",
      header: "Collection ID",
      cell: ({ row }) => <span className="font-mono text-sm text-primary hover:underline cursor-pointer">{row.getValue("id")}</span>
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("source")}</span>
    },
    {
      accessorKey: "route",
      header: "Failed Route",
    },
    {
      accessorKey: "scheduledDate",
      header: "Date Missed",
    },
    {
      accessorKey: "reason",
      header: "Reason Logged",
      cell: ({ row }) => <span className="text-amber-600 dark:text-amber-500 font-medium">{row.getValue("reason")}</span>
    },
    {
      accessorKey: "status",
      header: "Resolution",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Rescheduled") return <Badge variant="outline" className="text-muted-foreground">Rescheduled</Badge>
        return <Badge variant="destructive">Action Required</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Unresolved") return <Button size="sm" variant="secondary">Resolve</Button>
        return null
      }
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Missed Collections (Exceptions)" 
        description="First-class view of collection failures requiring immediate operational resolution."
      />
      
      <div className="flex gap-4 border-b border-border mt-2">
        <a href="/uco/collections/pending" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Pending</a>
        <a href="/uco/collections/scheduled" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Scheduled</a>
        <a href="/uco/collections/completed" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Completed</a>
        <Button variant="ghost" className="rounded-none border-b-2 border-destructive text-destructive font-medium bg-destructive/10 hover:bg-destructive/10 hover:text-destructive">Missed Exceptions</Button>
      </div>

      <FilterBar 
        placeholder="Search missed collections..." 
        views={["Action Required (Unresolved)", "All Missed"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockMissedCollections} 
        />
      </div>
    </WorkspaceLayout>
  )
}
