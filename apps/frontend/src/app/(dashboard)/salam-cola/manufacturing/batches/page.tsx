"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BatchDetailDrawer } from "@/components/salam-cola/batch-drawer"
import { ProductionBatch } from "@/types"
import { mockBatches } from "@/app/(dashboard)/_data/salam"


export default function ProductionBatchesPage() {
  const [selectedBatch, setSelectedBatch] = React.useState<ProductionBatch | null>(null)

  const columns: ColumnDef<ProductionBatch>[] = [
    {
      accessorKey: "id",
      header: "Batch ID",
      cell: ({ row }) => (
        <span 
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedBatch(row.original)}
        >
          {row.getValue("id")}
        </span>
      )
    },
    {
      accessorKey: "product",
      header: "Product",
    },
    {
      accessorKey: "productionDate",
      header: "Date",
    },
    {
      accessorKey: "quantityProduced",
      header: () => <div className="text-right">Quantity</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{(row.getValue("quantityProduced") as number).toLocaleString()}</div>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Released") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Released</Badge>
        if (status === "QA Hold") return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">QA Hold</Badge>
        if (status === "Recalled") return <Badge variant="destructive">Recalled</Badge>
        return <Badge variant="outline">{status}</Badge>
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Production Batches" 
        description="Monitor daily production runs and QA status."
        actions={<Button>New Production Run</Button>}
      />
      
      <FilterBar 
        placeholder="Search batches..." 
        views={["Today's Production", "QA Hold", "Recalled"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockBatches} 
        />
      </div>

      <BatchDetailDrawer 
        batch={selectedBatch} 
        onClose={() => setSelectedBatch(null)} 
      />
    </WorkspaceLayout>
  )
}
