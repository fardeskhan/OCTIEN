"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { PermissionImpactView } from "@/components/governance/permission-impact-view"
import { AffectedUser, Role } from "@/types"
import { mockRoles } from "@/app/(dashboard)/_data/governance"
import { mockAffectedUsers } from "@/app/(dashboard)/_data/governance"




export default function SecurityRolesPage() {
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null)

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: "Role Name",
      cell: ({ row }) => (
        <span 
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedRole(row.original)}
        >
          {row.getValue("name")}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "assignedUsers",
      header: () => <div className="text-right">Assigned Users</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("assignedUsers")}</div>
    },
    {
      accessorKey: "isCustom",
      header: "Type",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("isCustom") ? "Custom" : "System Built-in"}</span>
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSelectedRole(row.original)}>Edit Role</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Role Management" 
        description="Define roles and their associated permission policies."
        actions={<Button>Create Custom Role</Button>}
      />
      
      <FilterBar 
        placeholder="Search roles..." 
        views={["All Roles", "Custom Roles"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockRoles} 
        />
      </div>

      <EntityDrawer
        open={!!selectedRole}
        onOpenChange={(open) => !open && setSelectedRole(null)}
        title={`Edit Role: ${selectedRole?.name}`}
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Settings</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Permissions Map</div>
            <div className="border-b-2 border-primary pb-2 text-sm font-medium cursor-pointer">Impact Analysis</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Audit</div>
          </div>
        }
        actions={
          <>
            <Button variant="outline">Cancel</Button>
            <Button>Apply Changes</Button>
          </>
        }
      >
        <div className="mt-4">
          <PermissionImpactView 
            roleName={selectedRole?.name || ""}
            affectedUsersCount={selectedRole?.assignedUsers || 0}
            permissionsAdded={["View Treasury", "Create Journal", "Approve Bills"]}
            permissionsRemoved={["Close Period", "Modify Roles"]}
            affectedUsers={mockAffectedUsers}
          />
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}

