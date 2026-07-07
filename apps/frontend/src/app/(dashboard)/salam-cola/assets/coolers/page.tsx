"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KPICard } from "@/components/ui/kpi-card"
import { Cooler } from "@/types"
import { mockCoolers } from "@/app/(dashboard)/_data/salam"



export default function CoolersPage() {
  const columns: ColumnDef<Cooler>[] = [
    {
      accessorKey: "assetId",
      header: "Asset ID",
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("assetId")}</span>
    },
    {
      accessorKey: "model",
      header: "Model",
    },
    {
      accessorKey: "store",
      header: "Current Store",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("store")}</span>
    },
    {
      accessorKey: "installDate",
      header: "Installed",
    },
    {
      accessorKey: "lastService",
      header: "Last Service",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Active") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>
        if (status === "Maintenance Due") return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Maintenance Due</Badge>
        if (status === "Missing") return <Badge variant="destructive">Missing</Badge>
        return <Badge variant="outline">Out of Service</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost">Service History</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Cooler Fleet Management" 
        description="Track branded refrigerators and chillers across retail outlets."
        actions={<Button>Register New Asset</Button>}
      />

      <WorkspaceKPIs>
        <KPICard title="Total Active Coolers" value="12,450" />
        <KPICard title="Maintenance Due" value="342" trend={15} />
        <KPICard title="Missing / Unreachable" value="23" trend={-2} />
      </WorkspaceKPIs>
      
      <FilterBar 
        placeholder="Search by Asset ID or Store..." 
        views={["Requires Service", "Missing Assets", "All Active"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockCoolers} 
        />
      </div>
    </WorkspaceLayout>
  )
}
