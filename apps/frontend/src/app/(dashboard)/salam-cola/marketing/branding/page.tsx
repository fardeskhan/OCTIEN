"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RetailBranding } from "@/types"
import { mockBranding } from "@/app/(dashboard)/_data/salam"



export default function RetailBrandingPage() {
  const columns: ColumnDef<RetailBranding>[] = [
    {
      accessorKey: "storeName",
      header: "Store Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("storeName")}</span>
    },
    {
      accessorKey: "brandingType",
      header: "Type",
    },
    {
      accessorKey: "installDate",
      header: "Installed",
    },
    {
      accessorKey: "condition",
      header: "Condition",
      cell: ({ row }) => {
        const cond = row.getValue("condition") as string
        if (cond === "Excellent") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Excellent</Badge>
        if (cond === "Needs Replacement") return <Badge variant="destructive">Replace</Badge>
        return <Badge variant="secondary">Good</Badge>
      }
    },
    {
      accessorKey: "cost",
      header: () => <div className="text-right">Investment</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">${(row.getValue("cost") as number).toLocaleString()}</div>
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Retail Branding" 
        description="Manage permanent in-store branding and signage."
        actions={<Button>Request New Branding</Button>}
      />
      
      <FilterBar 
        placeholder="Search stores..." 
        views={["Needs Replacement", "All Active Signage"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockBranding} 
        />
      </div>
    </WorkspaceLayout>
  )
}
