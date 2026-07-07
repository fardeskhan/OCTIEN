"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, Map, ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle } from "lucide-react"

export default function SalamColaOverviewPage() {
  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Salam Cola Executive Cockpit" 
        description="FMCG operations and marketing overview."
      />
      
      {/* Row 1: Key Commercial Metrics */}
      <div className="mt-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Commercial Performance</h2>
        <WorkspaceKPIs>
          <KPICard title="Sales Volume" value="1.2M Cases" trend={5.2} freshness="Live" />
          <KPICard title="Revenue" value="$4.5M" trend={3.1} freshness="Live" />
          <KPICard title="Outstanding AR" value="$850K" trend={-2.4} freshness="Updated 1h ago" />
        </WorkspaceKPIs>
      </div>

      {/* Row 2: FMCG Specific Metrics */}
      <div className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Network & Distribution Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Distributor Health</p>
                <Activity className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">88/100</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Avg Score across network</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Active Distributors</p>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">145</span>
                <span className="flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-500">
                  <ArrowUpRight className="h-3 w-3" /> 2
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ordering within 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Numeric Distribution</p>
                <Map className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">76%</span>
                <span className="flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-500">
                  <ArrowUpRight className="h-3 w-3" /> 1.5%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Of total addressable market</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-500">At-Risk Territories</p>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-500">3</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Declining coverage &gt; 5%</p>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Row 3: Marketing & Assets */}
      <div className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Marketing & Placements</h2>
        <WorkspaceKPIs>
          <KPICard title="Campaign ROI (YTD)" value="245%" trend={12} />
          <KPICard title="Active Coolers" value="12,450" />
          <KPICard title="Missing Assets" value="23" trend={-2} />
        </WorkspaceKPIs>
      </div>

    </WorkspaceLayout>
  )
}
