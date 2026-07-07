"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { KPICard } from "@/components/ui/kpi-card"
import { Customer } from "@/types"
import { mockUcoCustomers } from "@/app/(dashboard)/_data/uco"




export default function CustomerSalesPage() {
  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("name")}</span>
    },
    {
      accessorKey: "industry",
      header: "Industry",
    },
    {
      accessorKey: "volumePurchased",
      header: () => <div className="text-right">Volume (MTD)</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{(row.getValue("volumePurchased") as number).toLocaleString()} KG</div>
    },
    {
      accessorKey: "avgPricePerKg",
      header: () => <div className="text-right">Avg Price / KG</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">${row.getValue("avgPricePerKg")}</div>
    },
    {
      accessorKey: "revenue",
      header: () => <div className="text-right">Revenue (MTD)</div>,
      cell: ({ row }) => <div className="text-right tabular-nums text-emerald-600 font-medium">${(row.getValue("revenue") as number).toLocaleString()}</div>
    },
    {
      accessorKey: "marginPct",
      header: () => <div className="text-right">Margin</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("marginPct")}%</div>
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="UCO Sales & Resale Customers" 
        description="Track outbound sales of processed UCO to downstream industries."
        actions={<Button>Create Sales Order</Button>}
      />

      <WorkspaceKPIs>
        <KPICard title="Total Volume Sold" value="25,500 KG" trend={5.2} />
        <KPICard title="Blended Price / KG" value="$0.84" trend={0.02} />
        <KPICard title="Gross Margin" value="44%" trend={1.5} />
      </WorkspaceKPIs>
      
      <FilterBar 
        placeholder="Search customers..." 
        views={["Biodiesel Only", "High Margin (>40%)"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockUcoCustomers} 
        />
      </div>
    </WorkspaceLayout>
  )
}
