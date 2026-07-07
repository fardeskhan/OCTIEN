"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Placement } from "@/types"
import { mockPlacements } from "@/app/(dashboard)/_data/salam"



export default function StorePlacementsPage() {
  const columns: ColumnDef<Placement>[] = [
    {
      accessorKey: "storeName",
      header: "Store Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("storeName")}</span>
    },
    {
      accessorKey: "district",
      header: "District",
    },
    {
      accessorKey: "assetType",
      header: "Asset Placed",
    },
    {
      accessorKey: "placedOn",
      header: "Date Placed",
    },
    {
      accessorKey: "performanceMultiplier",
      header: () => <div className="text-right">Sales Multiplier</div>,
      cell: ({ row }) => {
        const mult = row.getValue("performanceMultiplier") as number
        return <div className="text-right font-medium text-emerald-600">{mult}x</div>
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Store Placements" 
        description="Track physical asset placements and their impact on store sales."
        actions={<Button>Log Placement</Button>}
      />
      
      <FilterBar 
        placeholder="Search placements..." 
        views={["High Performers", "Recent Placements"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockPlacements} 
        />
      </div>
    </WorkspaceLayout>
  )
}
