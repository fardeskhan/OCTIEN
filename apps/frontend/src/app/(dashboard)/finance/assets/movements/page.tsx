"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { AssetMovement } from "@/types"
import { mockMovements } from "@/app/(dashboard)/_data/finance"



export default function AssetMovementsPage() {
  const columns: ColumnDef<AssetMovement>[] = [
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "type",
      header: "Movement Type",
      cell: ({ row }) => <span className="font-medium text-muted-foreground">{row.getValue("type")}</span>
    },
    {
      accessorKey: "asset",
      header: "Asset",
      cell: ({ row }) => <span className="font-medium">{row.getValue("asset")}</span>
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Value Impact</div>,
      cell: ({ row }) => {
        const val = row.getValue("amount") as number
        if (val === 0) return <div className="text-right tabular-nums text-muted-foreground">-</div>
        return <div className="text-right tabular-nums">{val > 0 ? "+" : "-"}${Math.abs(val).toLocaleString()}</div>
      },
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Asset Movements" 
        description="Log of acquisitions, disposals, transfers, and revaluations."
        actions={<Button variant="outline">Export Log</Button>}
      />
      
      <FilterBar 
        placeholder="Search movements..." 
        views={["All Movements", "Acquisitions", "Disposals", "Transfers"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockMovements} 
        />
      </div>
    </WorkspaceLayout>
  )
}
