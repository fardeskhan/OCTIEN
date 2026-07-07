"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { AuditTimeline } from "@/components/governance/audit-timeline"
import { AuditEventDrawer } from "@/components/governance/audit-event-drawer"
import { AuditEvent } from "@/types"
import { mockAuditEvents } from "@/app/(dashboard)/_data/governance"


export default function AuditTrailPage() {
  const [selectedEvent, setSelectedEvent] = React.useState<AuditEvent | null>(null)

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Audit Trail" 
        description="Chronological record of all system events."
      />
      
      <FilterBar 
        placeholder="Search events..." 
        views={["Today", "Last 7 Days", "Critical Only"]}
      />

      <div className="flex-1 overflow-y-auto mt-4 pr-4">
        <AuditTimeline 
          events={mockAuditEvents} 
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
