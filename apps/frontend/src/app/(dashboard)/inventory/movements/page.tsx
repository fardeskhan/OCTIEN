"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Movement } from "@/types"
import { mockMovements } from "@/app/(dashboard)/_data/inventory"



export default function MovementsPage() {
  const columns: ColumnDef<Movement>[] = [
    {
      accessorKey: "date",
      header: "Date/Time",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        return <Badge variant="outline">{type}</Badge>
      }
    },
    {
      accessorKey: "productCode",
      header: "Product",
      cell: ({ row }) => <span className="font-medium">{row.getValue("productCode")}</span>,
    },
    {
      accessorKey: "quantity",
      header: () => <div className="text-right">Quantity</div>,
      cell: ({ row }) => {
        const qty = row.getValue("quantity") as number
        return (
          <div className={`text-right font-medium ${qty > 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
            {qty > 0 ? "+" : ""}{qty}
          </div>
        )
      },
    },
    {
      accessorKey: "location",
      header: "Location",
    },
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("reference")}</span>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Inventory Movements" 
        description="Audit log of all stock changes across the organization."
        actions={<Button variant="outline">Export Report</Button>}
      />
      
      <FilterBar 
        placeholder="Search movements..." 
        views={["All Movements", "Receipts Only", "Issues Only"]}
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
