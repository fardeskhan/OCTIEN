"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { TerritoryCoverageMap } from "@/components/salam-cola/territory-map"
import { Territory } from "@/types"
import { mockTerritories } from "@/app/(dashboard)/_data/salam"



export default function TerritoriesPage() {
  const columns: ColumnDef<Territory>[] = [
    {
      accessorKey: "name",
      header: "Territory Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("name")}</span>
    },
    {
      accessorKey: "region",
      header: "Region",
    },
    {
      accessorKey: "distributors",
      header: () => <div className="text-right">Distributors</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("distributors")}</div>
    },
    {
      accessorKey: "coverage",
      header: () => <div className="text-right">Coverage</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("coverage")}%</div>
    },
    {
      accessorKey: "status",
      header: "Status",
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Territories & Routing" 
        description="Manage geographic sales territories and route planning."
        actions={<Button>Add Territory</Button>}
      />

      <div className="mt-4 mb-8">
        <TerritoryCoverageMap zones={mockTerritories} />
      </div>
      
      <FilterBar 
        placeholder="Search territories..." 
        views={["All Territories", "At Risk (<70% Coverage)"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockTerritories} 
        />
      </div>
    </WorkspaceLayout>
  )
}
