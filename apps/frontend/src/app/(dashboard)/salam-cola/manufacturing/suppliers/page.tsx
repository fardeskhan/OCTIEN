"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Supplier } from "@/types"
import { mockSuppliers } from "@/app/(dashboard)/_data/salam"



export default function SuppliersPage() {
  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: "name",
      header: "Supplier Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("name")}</span>
    },
    {
      accessorKey: "materialType",
      header: "Material Supplied",
    },
    {
      accessorKey: "qualityScore",
      header: () => <div className="text-right">Quality Score</div>,
      cell: ({ row }) => {
        const score = row.getValue("qualityScore") as number
        return (
          <div className={`text-right font-medium ${score > 95 ? "text-emerald-600 dark:text-emerald-500" : score > 80 ? "text-amber-500" : "text-destructive"}`}>
            {score}/100
          </div>
        )
      }
    },
    {
      accessorKey: "activeOrders",
      header: () => <div className="text-right">Active Orders</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("activeOrders")}</div>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Active") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>
        if (status === "Probation") return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Probation</Badge>
        return <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost">Audit Report</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Bottle & Ingredient Suppliers" 
        description="Manage direct material suppliers for Salam Cola manufacturing."
        actions={<Button>New Supplier</Button>}
      />
      
      <FilterBar 
        placeholder="Search suppliers..." 
        views={["All Active", "Raw Ingredients", "Packaging"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockSuppliers} 
        />
      </div>
    </WorkspaceLayout>
  )
}
