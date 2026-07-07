"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { KPICard } from "@/components/ui/kpi-card"
import { Valuation } from "@/types"
import { mockValuations } from "@/app/(dashboard)/_data/inventory"



export default function ValuationPage() {
  const columns: ColumnDef<Valuation>[] = [
    {
      accessorKey: "category",
      header: "Asset Category",
      cell: ({ row }) => <span className="font-medium">{row.getValue("category")}</span>,
    },
    {
      accessorKey: "totalItems",
      header: () => <div className="text-right">Total Units</div>,
      cell: ({ row }) => <div className="text-right">{row.getValue("totalItems")}</div>,
    },
    {
      accessorKey: "avgCost",
      header: () => <div className="text-right">Avg Unit Cost</div>,
      cell: ({ row }) => <div className="text-right">${(row.getValue("avgCost") as number).toFixed(2)}</div>,
    },
    {
      accessorKey: "totalValue",
      header: () => <div className="text-right">Total Asset Value</div>,
      cell: ({ row }) => <div className="text-right font-medium">${(row.getValue("totalValue") as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>,
    },
    {
      accessorKey: "turnoverRatio",
      header: () => <div className="text-right">Turnover (Annual)</div>,
      cell: ({ row }) => <div className="text-right">{row.getValue("turnoverRatio")}x</div>,
    },
  ]

  const totalInventoryValue = mockValuations.reduce((acc, curr) => acc + curr.totalValue, 0)

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Inventory Valuation" 
        description="Financial perspective of on-hand assets."
        actions={<Button variant="outline">Run Month-End Snapshot</Button>}
      />

      <WorkspaceKPIs>
        <KPICard title="Total Inventory Value" value={`$${(totalInventoryValue/1000).toFixed(1)}K`} trend={3.2} freshness="Live" />
        <KPICard title="Avg Turnover Ratio" value="10.3x" trend={-1.5} freshness="Live" />
        <KPICard title="Categories Tracked" value="14" freshness="Live" />
        <KPICard title="Obsolete Value (Est)" value="$12.4K" variant="warning" freshness="Live" />
      </WorkspaceKPIs>
      
      <FilterBar 
        placeholder="Search categories..." 
        views={["All Categories", "High Value", "Slow Moving"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockValuations} 
        />
      </div>
    </WorkspaceLayout>
  )
}
