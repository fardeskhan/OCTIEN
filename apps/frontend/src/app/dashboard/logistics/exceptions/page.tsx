"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Exception = {
  id: string
  date: string
  type: "Late Delivery" | "Missing POD" | "Expired EWB" | "Failed Delivery"
  reference: string
  transporter: string
  status: "Open" | "Investigating" | "Resolved"
  severity: "High" | "Medium" | "Low"
}

const mockExceptions: Exception[] = [
  { id: "EXC-001", date: "2026-07-06", type: "Late Delivery", reference: "SHP-2026-554", transporter: "Fast Freight", status: "Open", severity: "High" },
  { id: "EXC-002", date: "2026-07-06", type: "Missing POD", reference: "SHP-2026-532", transporter: "Global Logistics", status: "Investigating", severity: "Medium" },
  { id: "EXC-003", date: "2026-07-05", type: "Expired EWB", reference: "EWB-9988776", transporter: "Internal Fleet", status: "Open", severity: "High" },
  { id: "EXC-004", date: "2026-07-04", type: "Failed Delivery", reference: "SHP-2026-511", transporter: "Fast Freight", status: "Resolved", severity: "Low" },
]

export default function ExceptionsPage() {
  const columns: ColumnDef<Exception>[] = [
    {
      accessorKey: "id",
      header: "Exception ID",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("id")}</span>,
    },
    {
      accessorKey: "date",
      header: "Date Reported",
    },
    {
      accessorKey: "type",
      header: "Exception Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        return <span className="font-semibold text-destructive">{type}</span>
      }
    },
    {
      accessorKey: "reference",
      header: "Reference",
    },
    {
      accessorKey: "transporter",
      header: "Transporter",
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => {
        const sev = row.getValue("severity") as string
        return (
          <Badge variant={sev === "High" ? "destructive" : sev === "Medium" ? "warning" : "secondary"}>
            {sev}
          </Badge>
        )
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Resolved" ? "default" : status === "Investigating" ? "warning" : "outline"}>
            {status}
          </Badge>
        )
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Logistics Exceptions" 
        description="Monitor and resolve critical issues in the logistics network."
        actions={<Button>Export Report</Button>}
      />
      
      <FilterBar 
        placeholder="Search exceptions..." 
        views={["All Open", "High Severity", "Missing POD", "Resolved"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockExceptions} 
          renderBulkActions={(selected) => (
            <>
              <Button variant="secondary" size="sm">Mark Investigating</Button>
              <Button variant="secondary" size="sm">Resolve</Button>
            </>
          )}
        />
      </div>
    </WorkspaceLayout>
  )
}
