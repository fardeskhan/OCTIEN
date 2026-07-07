"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Partner } from "@/types"
import { mockPartners } from "@/app/(dashboard)/_data/salam"



export default function FillingPartnersPage() {
  const columns: ColumnDef<Partner>[] = [
    {
      accessorKey: "name",
      header: "Partner Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("name")}</span>
    },
    {
      accessorKey: "lines",
      header: "Filling Lines",
    },
    {
      accessorKey: "certifications",
      header: "Certifications",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {(row.getValue("certifications") as string[]).map((c) => (
            <span key={c} className="text-xs bg-muted px-2 py-1 rounded-md">{c}</span>
          ))}
        </div>
      )
    },
    {
      accessorKey: "status",
      header: "Status",
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Filling Partners" 
        description="Manage regional bottling and filling partners."
        actions={<Button>Add Partner</Button>}
      />
      
      <FilterBar 
        placeholder="Search partners..." 
        views={["Active Partners", "Expiring Certifications"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockPartners} 
        />
      </div>
    </WorkspaceLayout>
  )
}
