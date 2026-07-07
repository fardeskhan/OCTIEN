"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TradeScheme } from "@/types"
import { mockSchemes } from "@/app/(dashboard)/_data/salam"



export default function TradeSchemesPage() {
  const columns: ColumnDef<TradeScheme>[] = [
    {
      accessorKey: "name",
      header: "Scheme Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("name")}</span>
    },
    {
      accessorKey: "type",
      header: "Scheme Type",
    },
    {
      accessorKey: "budget",
      header: () => <div className="text-right">Budget</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">${(row.getValue("budget") as number).toLocaleString()}</div>
    },
    {
      accessorKey: "utilization",
      header: () => <div className="text-right">Utilization</div>,
      cell: ({ row }) => {
        const util = row.getValue("utilization") as number
        const budget = row.getValue("budget") as number
        const pct = Math.round((util / budget) * 100)
        return (
          <div className="text-right flex items-center justify-end gap-2">
             <span className="tabular-nums">${util.toLocaleString()}</span>
             <Badge variant="secondary" className="text-xs">{pct}%</Badge>
          </div>
        )
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Active") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>
        if (status === "Draft") return <Badge variant="secondary">Draft</Badge>
        return <Badge variant="outline" className="text-muted-foreground">Completed</Badge>
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Trade Schemes" 
        description="Manage distributor and retailer incentive programs."
        actions={<Button>Create Scheme</Button>}
      />
      
      <FilterBar 
        placeholder="Search schemes..." 
        views={["Active Schemes", "Pending Approval", "Completed"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockSchemes} 
        />
      </div>
    </WorkspaceLayout>
  )
}
