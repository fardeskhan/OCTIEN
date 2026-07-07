"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KPICard } from "@/components/ui/kpi-card"
import { ApprovalDrawer } from "@/components/governance/approval-drawer"
import { Check, X, ShieldAlert } from "lucide-react"
import { ApprovalRequest } from "@/types"
import { mockRequests } from "@/app/(dashboard)/_data/governance"


export default function ApprovalsInboxPage() {
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
      accessorKey: "riskScore",
      header: () => <div className="text-right">Risk Score</div>,
      cell: ({ row }) => {
        const score = row.getValue("riskScore") as number
        return (
          <div className="flex justify-end items-center gap-2">
            {score > 75 && <ShieldAlert className="w-3 h-3 text-destructive" />}
            <span className={`tabular-nums font-medium ${score > 75 ? "text-destructive" : score > 40 ? "text-amber-500" : "text-emerald-500"}`}>
              {score}/100
            </span>
          </div>
        )
      }
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
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => {}}><X className="h-4 w-4 text-destructive" /></Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => {}}><Check className="h-4 w-4 text-emerald-600" /></Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Approvals Inbox" 
        description="Requests requiring your review and authorization."
        actions={<Button variant="outline">Delegate Inbox</Button>}
      />

      <WorkspaceKPIs>
        <KPICard title="My Pending Approvals" value="3" />
        <KPICard title="High Risk Requests" value="2" trend={1} />
        <KPICard title="Avg Response Time" value="1.2 Days" />
      </WorkspaceKPIs>
      
      <FilterBar 
        placeholder="Search requests..." 
        views={["Requires My Action", "High Risk", "All Active"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockRequests} 
        />
      </div>

      <ApprovalDrawer 
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onApprove={(id) => { console.log("Approved", id); setSelectedRequest(null) }}
        onReject={(id) => { console.log("Rejected", id); setSelectedRequest(null) }}
        onRequestChanges={(id) => { console.log("Changes requested", id); setSelectedRequest(null) }}
      />
    </WorkspaceLayout>
  )
}
