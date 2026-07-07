"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { Button } from "@/components/ui/button"

export default function BatchTraceabilityPage() {
  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Batch Traceability" 
        description="End-to-end lineage mapping from raw ingredients to distributor receipt."
        actions={<Button>Export Trace Report</Button>}
      />
      
      <div className="flex-1 mt-4 p-8 border border-border rounded-lg bg-card flex flex-col items-center justify-center">
        <h3 className="text-lg font-medium text-muted-foreground mb-2">Scan or Enter Batch/Lot Number</h3>
        <div className="flex gap-2 w-full max-w-md">
          <input 
            type="text" 
            placeholder="e.g. BCH-2607-001 or LOT-A992" 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button>Trace</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Graph visualization will render upon search.</p>
      </div>
    </WorkspaceLayout>
  )
}
