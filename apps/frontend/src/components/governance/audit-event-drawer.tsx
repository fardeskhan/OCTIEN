"use client"
import * as React from "react"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { Badge } from "@/components/ui/badge"
import { AuditEvent } from "@/types"

type AuditEventDrawerProps = {
  event: AuditEvent | null
  onClose: () => void
}

export function AuditEventDrawer({ event, onClose }: AuditEventDrawerProps) {
  if (!event) return null

  return (
    <EntityDrawer
      open={!!event}
      onOpenChange={(open) => !open && onClose()}
      title={`Audit Event: ${event.id}`}
      kpis={
        <>
          <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0">
            <span className="text-xs text-muted-foreground">User</span>
            <span className="font-semibold">{event.user}</span>
          </div>
          <div className="flex flex-col gap-1 border-r border-border px-4">
            <span className="text-xs text-muted-foreground">Type</span>
            <span className="font-semibold">{event.type}</span>
          </div>
          <div className="flex flex-col gap-1 border-r border-border px-4">
            <span className="text-xs text-muted-foreground">Timestamp</span>
            <span className="font-semibold">{event.timestamp}</span>
          </div>
          <div className="flex flex-col gap-1 px-4">
            <span className="text-xs text-muted-foreground">Severity</span>
            <Badge className="w-fit" variant={event.severity === "Critical" ? "destructive" : event.severity === "Warning" ? "outline" : "secondary"}>
              {event.severity}
            </Badge>
          </div>
        </>
      }
      tabs={
        <div className="flex gap-4 border-b border-border mt-4">
          <div className="border-b-2 border-primary pb-2 text-sm font-medium cursor-pointer">Details</div>
          <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Changes</div>
          <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Related Documents</div>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-4">Event Context</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Action</span>
              <p className="text-sm">{event.action}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Target Entity</span>
              <p className="text-sm">{event.entity}</p>
            </div>
          </div>
        </div>
        
        {(event.before || event.after) && (
          <div>
            <h3 className="text-sm font-medium mb-4">State Changes</h3>
            <div className="grid grid-cols-2 gap-4 border rounded-md p-4 bg-muted/20">
              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-2">Before</span>
                <pre className="text-xs bg-card p-2 rounded border">{JSON.stringify(event.before || {}, null, 2)}</pre>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-2">After</span>
                <pre className="text-xs bg-card p-2 rounded border border-emerald-500/50">{JSON.stringify(event.after || {}, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </EntityDrawer>
  )
}
