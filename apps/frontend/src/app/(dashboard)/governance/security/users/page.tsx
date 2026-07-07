"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KPICard } from "@/components/ui/kpi-card"
import { User } from "@/types"
import { mockUsers } from "@/app/(dashboard)/_data/governance"



export default function SecurityUsersPage() {
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.getValue("name")}</span>
          <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      )
    },
    {
      accessorKey: "role",
      header: "Primary Role",
    },
    {
      accessorKey: "lastLogin",
      header: "Last Login",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Active") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>
        if (status === "Dormant") return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Dormant</Badge>
        return <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline">Manage Access</Button>
        </div>
      )
    }
  ]

  // KPI calculations
  const highRiskCount = mockUsers.filter(u => u.isAdmin || u.status === "Dormant").length

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="User Management" 
        description="Manage user accounts, authentication status, and direct assignments."
        actions={<Button>Provision User</Button>}
      />

      <WorkspaceKPIs>
        <KPICard title="Total Active Users" value="142" />
        <KPICard title="High-Risk Users" value={highRiskCount.toString()} trend={1} />
        <KPICard title="Pending Invites" value="5" />
      </WorkspaceKPIs>
      
      <FilterBar 
        placeholder="Search users..." 
        views={["Active", "High Risk (Admins & Dormant)", "Disabled"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockUsers} 
        />
      </div>
    </WorkspaceLayout>
  )
}
