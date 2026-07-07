"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, Info, AlertTriangle } from "lucide-react"

export type AuditEvent = {
  id: string
  timestamp: string
  user: string
  action: string
  entity: string
  type: "Approval" | "Security" | "Compliance" | "Document" | "Finance" | "System"
  severity: "Info" | "Warning" | "Critical"
  details?: Record<string, any>
  before?: Record<string, any>
  after?: Record<string, any>
}

type AuditTimelineProps = {
  events: AuditEvent[]
  onEventClick?: (event: AuditEvent) => void
  className?: string
}

export function AuditTimeline({ events, onEventClick, className }: AuditTimelineProps) {
  return (
    <div className={cn("relative border-l-2 border-muted ml-4 space-y-6", className)}>
      {events.map((event, index) => {
        let Icon = Info
        let iconColor = "text-blue-500"
        let bgColor = "bg-blue-100 dark:bg-blue-900/30"
        let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary"

        if (event.severity === "Warning") {
          Icon = AlertTriangle
          iconColor = "text-amber-500"
          bgColor = "bg-amber-100 dark:bg-amber-900/30"
          badgeVariant = "outline"
        } else if (event.severity === "Critical") {
          Icon = ShieldAlert
          iconColor = "text-destructive"
          bgColor = "bg-destructive/20"
          badgeVariant = "destructive"
        }

        return (
          <div 
            key={event.id} 
            className="relative pl-6 group cursor-pointer"
            onClick={() => onEventClick?.(event)}
          >
            {/* Timeline node */}
            <div className={cn("absolute -left-[13px] top-1 h-6 w-6 rounded-full border-2 border-background flex items-center justify-center", bgColor)}>
              <Icon className={cn("h-3 w-3", iconColor)} />
            </div>

            {/* Event Content */}
            <div className="bg-card hover:bg-muted/30 transition-colors border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{event.action}</span>
                  <span className="text-muted-foreground text-sm">on</span>
                  <span className="font-medium text-sm text-primary">{event.entity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={badgeVariant} className={event.severity === "Warning" ? "border-amber-300 text-amber-700 dark:text-amber-400" : ""}>
                    {event.type}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="font-medium">{event.user}</span>
                <span>•</span>
                <span>{event.timestamp}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
