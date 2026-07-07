"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DepreciationEntry } from "@/types"
import { mockDepreciation } from "@/app/(dashboard)/_data/finance"



export default function DepreciationPage() {
  const columns: ColumnDef<DepreciationEntry>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          disabled={row.original.posted}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "assetName",
      header: "Asset",
      cell: ({ row }) => <span className="font-medium">{row.getValue("assetName")}</span>,
    },
    {
      accessorKey: "method",
      header: "Method",
    },
    {
      accessorKey: "period",
      header: "Period",
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Depreciation Expense</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">${(row.getValue("amount") as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>,
    },
    {
      accessorKey: "posted",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.getValue("posted") ? (
             <span className="text-emerald-600 dark:text-emerald-500 font-medium text-sm">Posted</span>
          ) : (
             <span className="text-muted-foreground text-sm">Draft</span>
          )}
        </div>
      )
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Depreciation Run" 
        description="Calculate and post monthly depreciation journal entries."
        actions={<Button>Post Selected to GL</Button>}
      />
      
      <FilterBar 
        placeholder="Search assets..." 
        views={["June 2026 (Pending)", "May 2026 (Posted)"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockDepreciation} 
        />
      </div>
    </WorkspaceLayout>
  )
}
