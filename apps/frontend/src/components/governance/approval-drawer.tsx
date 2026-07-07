"use client"
import * as React from "react"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type ApprovalRequest = {
  id: string
  type: string
  requester: string
  status: "Pending" | "Approved" | "Rejected" | "Changes Requested"
  amount?: number
  riskScore: number
  approversRemaining: number
  details?: Record<string, any>
}

type ApprovalDrawerProps = {
  request: ApprovalRequest | null
  onClose: () => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onRequestChanges?: (id: string) => void
}

export function ApprovalDrawer({ request, onClose, onApprove, onReject, onRequestChanges }: ApprovalDrawerProps) {
  if (!request) return null

  return (
    <EntityDrawer
      open={!!request}
      onOpenChange={(open) => !open && onClose()}
      title={`Request: ${request.id}`}
      kpis={
        <>
          <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0">
            <span className="text-xs text-muted-foreground">Amount</span>
            <span className="font-semibold">{request.amount ? `$${request.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</span>
          </div>
          <div className="flex flex-col gap-1 border-r border-border px-4">
            <span className="text-xs text-muted-foreground">Risk Score</span>
            <span className={`font-semibold ${request.riskScore > 75 ? "text-destructive" : request.riskScore > 40 ? "text-amber-500" : "text-emerald-500"}`}>
              {request.riskScore}/100
            </span>
          </div>
          <div className="flex flex-col gap-1 border-r border-border px-4">
            <span className="text-xs text-muted-foreground">Pending Approvals</span>
            <span className="font-semibold">{request.approversRemaining} remaining</span>
          </div>
          <div className="flex flex-col gap-1 px-4">
            <span className="text-xs text-muted-foreground">Status</span>
            <Badge className="w-fit" variant={
              request.status === "Approved" ? "default" :
              request.status === "Rejected" ? "destructive" :
              request.status === "Changes Requested" ? "secondary" : "outline"
            }>
              {request.status}
            </Badge>
          </div>
        </>
      }
      tabs={
        <div className="flex gap-4 border-b border-border mt-4">
          <div className="border-b-2 border-primary pb-2 text-sm font-medium cursor-pointer">Summary</div>
          <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Documents</div>
          <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Audit</div>
          <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">History</div>
        </div>
      }
      actions={
        request.status === "Pending" ? (
          <>
            <Button variant="outline" onClick={() => onRequestChanges?.(request.id)}>Request Changes</Button>
            <Button variant="destructive" onClick={() => onReject?.(request.id)}>Reject</Button>
            <Button onClick={() => onApprove?.(request.id)}>Approve</Button>
          </>
        ) : null
      }
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-4">Request Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Type</span>
              <p className="text-sm">{request.type}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Requester</span>
              <p className="text-sm">{request.requester}</p>
            </div>
          </div>
        </div>
        
        {request.details && (
          <div>
            <h3 className="text-sm font-medium mb-4">Additional Information</h3>
            <pre className="text-xs bg-card p-4 rounded-md border border-border whitespace-pre-wrap">
              {JSON.stringify(request.details, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </EntityDrawer>
  )
}
