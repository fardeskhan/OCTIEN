"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Transporter = {
  id: string
  name: string
  type: "Internal Fleet" | "Third Party"
  status: "Active" | "Inactive" | "Suspended"
  activeVehicles: number
  rating: number
}

const mockTransporters: Transporter[] = [
  { id: "TRN-001", name: "Internal Fleet", type: "Internal Fleet", status: "Active", activeVehicles: 24, rating: 4.8 },
  { id: "TRN-002", name: "Fast Freight", type: "Third Party", status: "Active", activeVehicles: 5, rating: 4.2 },
  { id: "TRN-003", name: "Global Logistics", type: "Third Party", status: "Active", activeVehicles: 12, rating: 3.9 },
  { id: "TRN-004", name: "Speedy Movers", type: "Third Party", status: "Suspended", activeVehicles: 0, rating: 2.1 },
]

export default function TransportersPage() {
  const columns: ColumnDef<Transporter>[] = [
    {
      accessorKey: "name",
      header: "Transporter Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "type",
      header: "Type",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Active" ? "default" : status === "Suspended" ? "destructive" : "secondary"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "activeVehicles",
      header: () => <div className="text-right">Active Vehicles</div>,
      cell: ({ row }) => <div className="text-right">{row.getValue("activeVehicles")}</div>,
    },
    {
      accessorKey: "rating",
      header: "Performance Rating",
      cell: ({ row }) => {
        const rating = row.getValue("rating") as number
        return <span>⭐ {rating.toFixed(1)}</span>
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Transporters" 
        description="Manage fleet partners and evaluate performance."
        actions={<Button>Onboard Transporter</Button>}
      />
      
      <FilterBar 
        placeholder="Search transporters..." 
        views={["All", "Internal Fleet", "Third Party", "Active"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockTransporters} 
        />
      </div>
    </WorkspaceLayout>
  )
}
