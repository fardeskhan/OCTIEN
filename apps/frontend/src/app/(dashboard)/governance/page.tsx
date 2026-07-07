"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AlertCircle, ShieldAlert, FileWarning, Key, ListChecks, CheckCircle2 } from "lucide-react"

export default function GovernanceOverviewPage() {
  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Governance & Security" 
        description="Centralized oversight for approvals, compliance, security, and audit."
      />
      
      {/* Row 1: Actionable Priorities */}
      <div className="mt-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Actionable Priorities</h2>
        <WorkspaceKPIs>
          <KPICard title="Open Approvals" value="14" trend={2} freshness="Live" />
          <KPICard title="Compliance Exceptions" value="3" freshness="Updated 10m ago" />
          <KPICard title="Security Risks" value="1" trend={0} freshness="Live" />
        </WorkspaceKPIs>
      </div>

      {/* Row 2: Status & Oversight */}
      <div className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Status & Oversight</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ListChecks className="h-4 w-4" /> Audit Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">142</div>
                  <p className="text-xs text-muted-foreground mt-1">Events logged today</p>
                </div>
                <div className="text-right text-xs">
                  <div className="text-emerald-600 dark:text-emerald-500 font-medium">95% Info</div>
                  <div className="text-amber-500 font-medium">5% Warning</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileWarning className="h-4 w-4" /> Policy Violations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-destructive">2</div>
                  <p className="text-xs text-muted-foreground mt-1">Require immediate review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Key className="h-4 w-4" /> Access Reviews Due
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">5</div>
                  <p className="text-xs text-muted-foreground mt-1">Pending admin sign-off</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 3: Recent Critical Events */}
      <div className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Critical Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-destructive bg-destructive/5">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <ShieldAlert className="h-4 w-4" /> Privilege Escalation
              </div>
              <p className="text-sm font-medium">User "John Doe" granted "SuperAdmin" role.</p>
              <p className="text-xs text-muted-foreground">10 mins ago • Security</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive bg-destructive/5">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" /> GST Filing Failed
              </div>
              <p className="text-sm font-medium">Automated job GST_FILING_07 returned 500 error.</p>
              <p className="text-xs text-muted-foreground">1 hour ago • Compliance</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-500">
                <FileWarning className="h-4 w-4" /> Large Journal Entry
              </div>
              <p className="text-sm font-medium">Journal entry over $1,000,000 posted by manual entry.</p>
              <p className="text-xs text-muted-foreground">2 hours ago • Audit</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
