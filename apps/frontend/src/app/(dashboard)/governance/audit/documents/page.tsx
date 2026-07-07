"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { AuditTimeline } from "@/components/governance/audit-timeline"
import { AuditEventDrawer } from "@/components/governance/audit-event-drawer"
import { AuditEvent } from "@/types"
import { mockDocEvents } from "@/app/(dashboard)/_data/governance"


export default function DocumentHistoryPage() {
  const [selectedEvent, setSelectedEvent] = React.useState<AuditEvent | null>(null)

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Document History" 
        description="Audit log of document uploads, modifications, and deletions."
      />
      
      <FilterBar 
        placeholder="Search document events..." 
        views={["Last 7 Days", "Uploads", "Deletions"]}
      />

      <div className="flex-1 overflow-y-auto mt-4 pr-4">
        <AuditTimeline 
          events={mockDocEvents} 
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
