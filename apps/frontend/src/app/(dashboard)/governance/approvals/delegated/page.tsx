"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { DelegatedRule } from "@/types"
import { mockDelegated } from "@/app/(dashboard)/_data/governance"



export default function DelegatedApprovalsPage() {
  const columns: ColumnDef<DelegatedRule>[] = [
    {
      accessorKey: "delegate",
      header: "Delegated To",
      cell: ({ row }) => <span className="font-medium">{row.getValue("delegate")}</span>
    },
    {
      accessorKey: "type",
      header: "Request Type",
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
    },
    {
      accessorKey: "endDate",
      header: "End Date",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Active") return <span className="text-emerald-600 dark:text-emerald-500 font-medium">{status}</span>
        if (status === "Scheduled") return <span className="text-amber-500 font-medium">{status}</span>
        return <span className="text-muted-foreground">{status}</span>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" className="text-destructive">Revoke</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Delegated Approvals" 
        description="Manage temporary delegation of your approval authority."
        actions={<Button>New Delegation</Button>}
      />
      
      <FilterBar 
        placeholder="Search rules..." 
        views={["Active", "All Rules"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockDelegated} 
        />
      </div>
    </WorkspaceLayout>
  )
}
