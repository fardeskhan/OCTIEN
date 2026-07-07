"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GSTFiling } from "@/types"
import { mockGST } from "@/app/(dashboard)/_data/governance"



export default function GSTCompliancePage() {
  const columns: ColumnDef<GSTFiling>[] = [
    {
      accessorKey: "period",
      header: "Return Period",
      cell: ({ row }) => <span className="font-medium">{row.getValue("period")}</span>
    },
    {
      accessorKey: "formType",
      header: "Form Type",
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
    },
    {
      accessorKey: "taxAmount",
      header: () => <div className="text-right">Tax Liability</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">${(row.getValue("taxAmount") as number).toLocaleString()}</div>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Filed") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Filed</Badge>
        if (status === "Failed" || status === "Overdue") return <Badge variant="destructive">{status}</Badge>
        return <Badge variant="secondary">{status}</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost">View Details</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="GST Compliance" 
        description="Manage statutory Goods and Services Tax filings and reconciliations."
        actions={<Button>Generate GSTR-1</Button>}
      />
      
      <FilterBar 
        placeholder="Search filings..." 
        views={["Current Year", "Pending Action"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockGST} 
        />
      </div>
    </WorkspaceLayout>
  )
}
