"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { AuditTimeline } from "@/components/governance/audit-timeline"
import { AuditEventDrawer } from "@/components/governance/audit-event-drawer"
import { AuditEvent } from "@/types"
import { mockCloseEvents } from "@/app/(dashboard)/_data/governance"


export default function PeriodCloseEventsPage() {
  const [selectedEvent, setSelectedEvent] = React.useState<AuditEvent | null>(null)

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Period Close Events" 
        description="Audit log of actions taken during the financial close process."
      />
      
      <FilterBar 
        placeholder="Search close events..." 
        views={["June 2026", "May 2026", "All Time"]}
      />

      <div className="flex-1 overflow-y-auto mt-4 pr-4">
        <AuditTimeline 
          events={mockCloseEvents} 
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
