"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { SamplingEvent } from "@/types"
import { mockEvents } from "@/app/(dashboard)/_data/salam"



export default function SamplingPage() {
  const columns: ColumnDef<SamplingEvent>[] = [
    {
      accessorKey: "eventName",
      header: "Event Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("eventName")}</span>
    },
    {
      accessorKey: "location",
      header: "Location",
    },
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "unitsDistributed",
      header: () => <div className="text-right">Units Distributed</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{(row.getValue("unitsDistributed") as number).toLocaleString()}</div>
    },
    {
      accessorKey: "conversionRate",
      header: () => <div className="text-right">Est. Conversion</div>,
      cell: ({ row }) => <div className="text-right tabular-nums text-emerald-600 font-medium">{row.getValue("conversionRate")}%</div>
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Sampling Activations" 
        description="Track product sampling events and trial conversions."
        actions={<Button>Log New Activation</Button>}
      />
      
      <FilterBar 
        placeholder="Search activations..." 
        views={["Recent Events", "High Conversion"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockEvents} 
        />
      </div>
    </WorkspaceLayout>
  )
}
