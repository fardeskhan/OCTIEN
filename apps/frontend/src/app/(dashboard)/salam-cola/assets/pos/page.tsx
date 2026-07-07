"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { POSMaterial } from "@/types"
import { mockPOS } from "@/app/(dashboard)/_data/salam"



export default function POSMaterialsPage() {
  const columns: ColumnDef<POSMaterial>[] = [
    {
      accessorKey: "item",
      header: "Material Item",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("item")}</span>
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "inventory",
      header: () => <div className="text-right">Current Stock</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("inventory")}</div>
    },
    {
      accessorKey: "reorderPoint",
      header: () => <div className="text-right">Reorder Point</div>,
      cell: ({ row }) => <div className="text-right tabular-nums text-muted-foreground">{row.getValue("reorderPoint")}</div>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "In Stock") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">In Stock</Badge>
        if (status === "Out of Stock") return <Badge variant="destructive">Out of Stock</Badge>
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Low Stock</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost">Reorder</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="POS Materials" 
        description="Manage inventory of Point-of-Sale marketing materials."
        actions={<Button>Add Material</Button>}
      />
      
      <FilterBar 
        placeholder="Search materials..." 
        views={["Low Stock Alerts", "All Materials"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockPOS} 
        />
      </div>
    </WorkspaceLayout>
  )
}
