"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ApprovalDrawer } from "@/components/governance/approval-drawer"
import { ApprovalRequest } from "@/types"
import { mockHistory } from "@/app/(dashboard)/_data/governance"


export default function ApprovalsHistoryPage() {
  const [selectedRequest, setSelectedRequest] = React.useState<ApprovalRequest | null>(null)

  const columns: ColumnDef<ApprovalRequest>[] = [
    {
      accessorKey: "id",
      header: "Request ID",
      cell: ({ row }) => (
        <span 
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedRequest(row.original)}
        >
          {row.getValue("id")}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
    },
    {
      accessorKey: "requester",
      header: "Requester",
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => {
        const amt = row.getValue("amount") as number | undefined
        return <div className="text-right tabular-nums">{amt ? `$${amt.toLocaleString()}` : "-"}</div>
      }
    },
    {
      accessorKey: "status",
      header: "Outcome",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Approved") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved</Badge>
        if (status === "Rejected") return <Badge variant="destructive">Rejected</Badge>
        return <Badge variant="secondary">{status}</Badge>
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Approval History" 
        description="Log of all requests you have previously acted upon."
        actions={<Button variant="outline">Export Log</Button>}
      />
      
      <FilterBar 
        placeholder="Search history..." 
        views={["Last 30 Days", "Approved", "Rejected"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockHistory} 
        />
      </div>

      <ApprovalDrawer 
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </WorkspaceLayout>
  )
}
