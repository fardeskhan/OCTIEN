"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { KPICard } from "@/components/ui/kpi-card"
import { CoverageData } from "@/types"
import { mockCoverage } from "@/app/(dashboard)/_data/salam"



export default function NumericCoveragePage() {
  const columns: ColumnDef<CoverageData>[] = [
    {
      accessorKey: "district",
      header: "District",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("district")}</span>
    },
    {
      accessorKey: "totalOutlets",
      header: () => <div className="text-right">Total Outlets</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{(row.getValue("totalOutlets") as number).toLocaleString()}</div>
    },
    {
      accessorKey: "coveredOutlets",
      header: () => <div className="text-right">Covered</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{(row.getValue("coveredOutlets") as number).toLocaleString()}</div>
    },
    {
      accessorKey: "numericDistribution",
      header: () => <div className="text-right">Numeric Dist. (%)</div>,
      cell: ({ row }) => {
        const val = row.getValue("numericDistribution") as number
        return <div className={`text-right font-medium ${val > 75 ? "text-emerald-600" : "text-amber-500"}`}>{val}%</div>
      }
    },
    {
      accessorKey: "weightedDistribution",
      header: () => <div className="text-right">Weighted Dist. (%)</div>,
      cell: ({ row }) => {
        const val = row.getValue("weightedDistribution") as number
        return <div className={`text-right font-medium ${val > 80 ? "text-emerald-600" : "text-amber-500"}`}>{val}%</div>
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Market Coverage" 
        description="Track Numeric and Weighted Distribution across districts."
        actions={<Button>Import Nielsen Data</Button>}
      />

      <WorkspaceKPIs>
        <KPICard title="Total Numeric Dist." value="76%" trend={1.5} />
        <KPICard title="Total Weighted Dist." value="82%" trend={2.1} />
        <KPICard title="Total Outlets Served" value="45,200" trend={850} />
      </WorkspaceKPIs>
      
      <FilterBar 
        placeholder="Search districts..." 
        views={["Top Performing", "Underpenetrated (<60%)"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockCoverage} 
        />
      </div>
    </WorkspaceLayout>
  )
}
