"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type EWB = {
  id: string
  date: string
  validUntil: string
  status: "Active" | "Expired" | "Cancelled"
  transporter: string
  origin: string
  destination: string
}

const mockEwbs: EWB[] = [
  { id: "EWB-123456789", date: "2026-07-06", validUntil: "2026-07-08 23:59", status: "Active", transporter: "Fast Freight", origin: "Main WH", destination: "Acme Corporation" },
  { id: "EWB-123456788", date: "2026-07-05", validUntil: "2026-07-07 23:59", status: "Active", transporter: "Internal Fleet", origin: "Supplier Depot", destination: "Main WH" },
  { id: "EWB-123456787", date: "2026-07-01", validUntil: "2026-07-03 23:59", status: "Expired", transporter: "Global Logistics", origin: "Main WH", destination: "TechStart Inc" },
]

export default function EWBPage() {
  const columns: ColumnDef<EWB>[] = [
    {
      accessorKey: "id",
      header: "E-Way Bill No.",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("id")}</span>,
    },
    {
      accessorKey: "date",
      header: "Generation Date",
    },
    {
      accessorKey: "validUntil",
      header: "Valid Until",
    },
    {
      accessorKey: "transporter",
      header: "Transporter",
    },
    {
      accessorKey: "origin",
      header: "Origin",
    },
    {
      accessorKey: "destination",
      header: "Destination",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Active" ? "default" : "destructive"}>
            {status}
          </Badge>
        )
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="E-Way Bills" 
        description="Manage compliance and tracking for electronic waybills."
        actions={<Button>Generate EWB</Button>}
      />
      
      <FilterBar 
        placeholder="Search E-Way Bills..." 
        views={["All", "Active", "Expiring Soon", "Expired"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockEwbs} 
        />
      </div>
    </WorkspaceLayout>
  )
}
