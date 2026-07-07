"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { AuditTimeline } from "@/components/governance/audit-timeline"
import { AuditEventDrawer } from "@/components/governance/audit-event-drawer"
import { AuditEvent } from "@/types"
import { mockSensitiveEvents } from "@/app/(dashboard)/_data/governance"


export default function SensitiveActionsPage() {
  const [selectedEvent, setSelectedEvent] = React.useState<AuditEvent | null>(null)

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Sensitive Actions" 
        description="Audit log filtered for high-risk and administrative actions."
      />
      
      <FilterBar 
        placeholder="Search sensitive actions..." 
        views={["Last 30 Days", "Security Actions", "Finance Actions"]}
      />

      <div className="flex-1 overflow-y-auto mt-4 pr-4">
        <AuditTimeline 
          events={mockSensitiveEvents} 
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
