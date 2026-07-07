"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ApprovalDrawer } from "@/components/governance/approval-drawer"
import { ApprovalRequest } from "@/types"
import { mockPending } from "@/app/(dashboard)/_data/governance"


export default function PendingApprovalsPage() {
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
      accessorKey: "approversRemaining",
      header: "Pending With",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("approversRemaining")} Approver(s)</span>
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost">Remind Approvers</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Pending Approvals" 
        description="Requests you submitted that are awaiting authorization."
        actions={<Button>New Request</Button>}
      />
      
      <FilterBar 
        placeholder="Search requests..." 
        views={["All Pending", "Overdue"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockPending} 
        />
      </div>

      <ApprovalDrawer 
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </WorkspaceLayout>
  )
}
