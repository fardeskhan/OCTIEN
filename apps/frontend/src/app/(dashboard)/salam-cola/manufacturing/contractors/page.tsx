"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Contractor } from "@/types"
import { mockContractors } from "@/app/(dashboard)/_data/salam"



export default function ContractManufacturersPage() {
  const columns: ColumnDef<Contractor>[] = [
    {
      accessorKey: "name",
      header: "Manufacturer Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("name")}</span>
    },
    {
      accessorKey: "region",
      header: "Region",
    },
    {
      accessorKey: "capacity",
      header: "Monthly Capacity",
    },
    {
      accessorKey: "utilization",
      header: () => <div>Utilization</div>,
      cell: ({ row }) => {
        const util = row.getValue("utilization") as number
        return (
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full ${util > 90 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${util}%` }} />
            </div>
            <span className="text-xs font-medium">{util}%</span>
          </div>
        )
      }
    },
    {
      accessorKey: "contractValidUntil",
      header: "Contract Expiry",
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Contract Manufacturers" 
        description="Manage 3P manufacturing capacity and contracts."
        actions={<Button>Onboard Manufacturer</Button>}
      />
      
      <FilterBar 
        placeholder="Search manufacturers..." 
        views={["All Active", "By Region"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockContractors} 
        />
      </div>
    </WorkspaceLayout>
  )
}
