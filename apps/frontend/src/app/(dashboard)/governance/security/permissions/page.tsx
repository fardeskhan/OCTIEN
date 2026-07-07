"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { PermissionDef } from "@/types"
import { mockPermissions } from "@/app/(dashboard)/_data/governance"



export default function SecurityPermissionsPage() {
  const columns: ColumnDef<PermissionDef>[] = [
    {
      accessorKey: "id",
      header: "Permission ID",
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("id")}</span>
    },
    {
      accessorKey: "module",
      header: "Module",
    },
    {
      accessorKey: "action",
      header: "Action",
    },
    {
      accessorKey: "description",
      header: "Description",
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Permission Catalog" 
        description="System registry of all available access permissions."
      />
      
      <FilterBar 
        placeholder="Search permissions..." 
        views={["All Permissions", "Finance", "Governance"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockPermissions} 
        />
      </div>
    </WorkspaceLayout>
  )
}
