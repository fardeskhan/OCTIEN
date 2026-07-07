"use client"
import * as React from "react"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Check, X, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AffectedUser } from "@/types"
type PermissionImpactViewProps = {
  roleName: string
  affectedUsersCount: number
  permissionsAdded: string[]
  permissionsRemoved: string[]
  affectedUsers: AffectedUser[]
}
export function PermissionImpactView({
  roleName,
  affectedUsersCount,
  permissionsAdded,
  permissionsRemoved,
  affectedUsers,
}: PermissionImpactViewProps) {
  const columns: ColumnDef<AffectedUser>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>
    },
    {
      accessorKey: "department",
      header: "Department",
    },
    {
      accessorKey: "currentRole",
      header: "Current Role",
    },
    {
      accessorKey: "newAccessCount",
      header: () => <div className="text-right">New Access Count</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">+{row.getValue("newAccessCount")}</div>
    },
    {
      accessorKey: "riskLevel",
      header: "Risk Level",
      cell: ({ row }) => {
        const risk = row.getValue("riskLevel") as string
        if (risk === "High") return <Badge variant="destructive"><ShieldAlert className="w-3 h-3 mr-1" /> High</Badge>
        if (risk === "Medium") return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Medium</Badge>
        return <Badge variant="outline" className="text-muted-foreground">Low</Badge>
      }
    }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/20 p-6 rounded-lg border border-border">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Target Role</span>
              <span className="text-sm font-medium">{roleName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Affected Users</span>
              <span className="text-sm font-medium">{affectedUsersCount}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-4">Permissions Added</h3>
          <ul className="space-y-2">
            {permissionsAdded.map((perm, i) => (
              <li key={i} className="flex items-center text-sm">
                <Check className="h-4 w-4 mr-2 text-emerald-500" />
                {perm}
              </li>
            ))}
            {permissionsAdded.length === 0 && <li className="text-sm text-muted-foreground">None</li>}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-destructive mb-4">Permissions Removed</h3>
          <ul className="space-y-2">
            {permissionsRemoved.map((perm, i) => (
              <li key={i} className="flex items-center text-sm">
                <X className="h-4 w-4 mr-2 text-destructive" />
                {perm}
              </li>
            ))}
            {permissionsRemoved.length === 0 && <li className="text-sm text-muted-foreground">None</li>}
          </ul>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">Affected Users Analysis</h3>
        <div className="border border-border rounded-md overflow-hidden">
          <DataTable columns={columns} data={affectedUsers} />
        </div>
      </div>
    </div>
  )
}
