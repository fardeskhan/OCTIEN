"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ForecastItem } from "@/types"
import { mockForecast } from "@/app/(dashboard)/_data/finance"



export default function ForecastPage() {
  const columns: ColumnDef<ForecastItem>[] = [
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "inflows",
      header: () => <div className="text-right">Projected Inflows</div>,
      cell: ({ row }) => <div className="text-right text-emerald-600 dark:text-emerald-500">${(row.getValue("inflows") as number).toLocaleString()}</div>,
    },
    {
      accessorKey: "outflows",
      header: () => <div className="text-right">Projected Outflows</div>,
      cell: ({ row }) => <div className="text-right text-amber-600 dark:text-amber-500">${Math.abs(row.getValue("outflows") as number).toLocaleString()}</div>,
    },
    {
      accessorKey: "netPosition",
      header: () => <div className="text-right">Net Daily Change</div>,
      cell: ({ row }) => {
        const val = row.getValue("netPosition") as number
        return <div className={`text-right font-medium ${val > 0 ? "text-emerald-600 dark:text-emerald-500" : "text-amber-600 dark:text-amber-500"}`}>
          {val > 0 ? "+" : ""}${val.toLocaleString()}
        </div>
      },
    },
    {
      accessorKey: "projectedBalance",
      header: () => <div className="text-right">Projected Balance</div>,
      cell: ({ row }) => <div className="text-right font-bold">${(row.getValue("projectedBalance") as number).toLocaleString()}</div>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Cash Flow Forecast" 
        description="Predict liquidity needs based on scheduled payables and receivables."
        actions={<Button variant="outline">Update Model</Button>}
      />

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">30-Day Liquidity Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-end justify-between gap-2 mt-2">
          {/* Simple mock chart visualization */}
          {[60, 62, 58, 65, 70, 68, 75, 80, 85, 82, 90, 95].map((h, i) => (
            <div key={i} className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-sm relative group cursor-pointer" style={{ height: `${h}%` }}>
              <div className="absolute top-0 left-0 right-0 bg-primary h-1 rounded-t-sm" />
              {/* Tooltip placeholder */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded">
                Day {i + 1}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      <FilterBar 
        className="mt-6"
        placeholder="Filter..." 
        views={["Next 7 Days", "Next 30 Days", "Next Quarter"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockForecast} 
        />
      </div>
    </WorkspaceLayout>
  )
}
