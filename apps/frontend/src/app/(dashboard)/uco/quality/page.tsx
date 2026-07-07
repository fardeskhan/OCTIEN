"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QualityInspection } from "@/types"
import { mockQualityTests } from "@/app/(dashboard)/_data/uco"




export default function QualityPage() {
  const columns: ColumnDef<QualityInspection>[] = [
    {
      accessorKey: "id",
      header: "QA Log",
      cell: ({ row }) => <span className="font-mono text-sm text-primary hover:underline cursor-pointer">{row.getValue("id")}</span>
    },
    {
      accessorKey: "source",
      header: "Source",
    },
    {
      accessorKey: "batchVolume",
      header: () => <div className="text-right">Volume (KG)</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("batchVolume")}</div>
    },
    {
      accessorKey: "ffaPct",
      header: () => <div className="text-right">FFA %</div>,
      cell: ({ row }) => {
         const val = row.getValue("ffaPct") as number
         return <div className={`text-right tabular-nums ${val > 15 ? 'text-destructive font-medium' : ''}`}>{val}%</div>
      }
    },
    {
      accessorKey: "moisturePct",
      header: () => <div className="text-right">Moisture %</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("moisturePct")}%</div>
    },
    {
      accessorKey: "status",
      header: "Acceptance",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Accepted") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Accepted</Badge>
        if (status === "Rejected") return <Badge variant="destructive">Rejected</Badge>
        return <Badge variant="outline">Pending Inspection</Badge>
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Oil Quality & Acceptance" 
        description="Track Free Fatty Acid (FFA), moisture, and acceptance rates for incoming UCO."
        actions={<Button>Log QA Result</Button>}
      />
      
      <FilterBar 
        placeholder="Search tests..." 
        views={["Pending Inspection", "Recent Rejects"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockQualityTests} 
        />
      </div>
    </WorkspaceLayout>
  )
}
