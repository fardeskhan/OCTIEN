"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { AuditTimeline } from "@/components/governance/audit-timeline"
import { AuditEventDrawer } from "@/components/governance/audit-event-drawer"
import { AuditEvent } from "@/types"
import { mockSecurityEvents } from "@/app/(dashboard)/_data/governance"


export default function SecurityEventsPage() {
  const [selectedEvent, setSelectedEvent] = React.useState<AuditEvent | null>(null)

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Security Events" 
        description="Audit log of authentication, authorization, and security policy events."
      />
      
      <FilterBar 
        placeholder="Search security events..." 
        views={["Last 24 Hours", "Failed Logins", "Privilege Changes"]}
      />

      <div className="flex-1 overflow-y-auto mt-4 pr-4">
        <AuditTimeline 
          events={mockSecurityEvents} 
          onEventClick={(evt) => setSelectedEvent(evt)} 
        />
      </div>

      <AuditEventDrawer 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
      />
    </WorkspaceLayout>
  )
}
