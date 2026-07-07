"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EWB } from "@/types"
import { mockEWBs } from "@/app/(dashboard)/_data/governance"



export default function EWayBillsPage() {
  const columns: ColumnDef<EWB>[] = [
    {
      accessorKey: "ewbNo",
      header: "EWB Number",
      cell: ({ row }) => <span className="font-medium">{row.getValue("ewbNo")}</span>
    },
    {
      accessorKey: "date",
      header: "Generation Date",
    },
    {
      accessorKey: "vehicle",
      header: "Vehicle Number",
    },
    {
      accessorKey: "destination",
      header: "Destination",
    },
    {
      accessorKey: "validUntil",
      header: "Valid Until",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Active") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>
        if (status === "Expired") return <Badge variant="destructive">Expired</Badge>
        return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {row.original.status === "Active" && <Button size="sm" variant="ghost">Extend</Button>}
          <Button size="sm" variant="ghost">View Details</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="E-Way Bills" 
        description="Monitor active transit documents and validity."
        actions={<Button>Generate EWB</Button>}
      />
      
      <FilterBar 
        placeholder="Search E-Way Bills..." 
        views={["Active", "Expiring Today", "All History"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockEWBs} 
        />
      </div>
    </WorkspaceLayout>
  )
}
