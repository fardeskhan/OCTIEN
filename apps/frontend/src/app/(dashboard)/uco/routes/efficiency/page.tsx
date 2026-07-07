"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { KPICard } from "@/components/ui/kpi-card"

export default function RouteEfficiencyPage() {
  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Route Efficiency Trends" 
        description="Analytics on route density, fuel cost per KG, and time utilization."
      />
      
      <div className="flex gap-4 border-b border-border mt-2">
        <a href="/uco/routes" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Active Routes</a>
        <a href="/uco/routes/stops" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Route Stops</a>
        <Button variant="ghost" className="rounded-none border-b-2 border-primary rounded-b-sm bg-accent text-accent-foreground font-medium">Efficiency Trends</Button>
        <a href="/uco/routes/exceptions" className="px-4 py-2 text-sm font-medium text-destructive hover:text-destructive/80">Route Exceptions</a>
      </div>

      <div className="mt-6 space-y-4">
        <WorkspaceKPIs>
          <KPICard title="Average Route Density" value="4.2 Stops/Hr" trend={1.1} />
          <KPICard title="Collection Time/Stop" value="12 mins" trend={-2} />
          <KPICard title="Fuel Cost / KG" value="$0.18" trend={-0.05} />
        </WorkspaceKPIs>

        <div className="p-8 border border-border rounded-lg bg-card flex flex-col items-center justify-center text-center mt-4">
          <h3 className="text-lg font-medium mb-2">Route Optimization Analysis</h3>
          <p className="text-sm text-muted-foreground max-w-lg mb-6">
            Visual mapping of planned vs. actual route execution times.
          </p>
          <div className="w-full max-w-4xl h-64 border border-dashed border-border rounded-md bg-muted/10 flex items-center justify-center text-muted-foreground/50">
            Chart Placeholder: Line Chart (Planned vs Actual Duration)
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}

import { Button } from "@/components/ui/button"
