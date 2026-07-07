"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, DollarSign } from "lucide-react"

export default function FinanceOverviewPage() {
  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Finance Overview" 
        description="CFO Cockpit - Real-time financial health and risk monitoring."
      />
      
      {/* Row 1: Key Financials */}
      <div className="mt-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Key Financials</h2>
        <WorkspaceKPIs>
          <KPICard title="Cash Position" value="$1.24M" trend={5.4} freshness="Live" />
          <KPICard title="AR Exposure" value="$450K" trend={-2.1} freshness="Live" />
          <KPICard title="AP Exposure" value="$280K" trend={1.5} freshness="Live" />
          <KPICard title="Current Profit (YTD)" value="$890K" trend={12.3} freshness="Live" />
        </WorkspaceKPIs>
      </div>

      {/* Row 2: Status & Compliance */}
      <div className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Status & Compliance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Period Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">Jul 2026</div>
                  <p className="text-xs text-muted-foreground mt-1">Current Open Period</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Close Readiness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">85%</div>
                  <p className="text-xs text-muted-foreground mt-1">Pre-close tasks completed</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Compliance Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">1 Warning</div>
                  <p className="text-xs text-muted-foreground mt-1">Tax filing due in 5 days</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 3: Trends */}
      <div className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Trends (30 Days)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Cash Flow Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="h-24 flex items-end justify-between gap-1 mt-2">
              {[40, 60, 45, 70, 65, 80, 95].map((h, i) => (
                <div key={i} className="w-full bg-emerald-500/20 dark:bg-emerald-500/10 rounded-t-sm" style={{ height: `${h}%` }}>
                  <div className="w-full bg-emerald-500 h-1 rounded-t-sm" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="h-24 flex items-end justify-between gap-1 mt-2">
              {[30, 40, 35, 50, 60, 75, 85].map((h, i) => (
                <div key={i} className="w-full bg-blue-500/20 dark:bg-blue-500/10 rounded-t-sm" style={{ height: `${h}%` }}>
                  <div className="w-full bg-blue-500 h-1 rounded-t-sm" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" /> Expense Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="h-24 flex items-end justify-between gap-1 mt-2">
              {[80, 75, 70, 75, 65, 60, 50].map((h, i) => (
                <div key={i} className="w-full bg-amber-500/20 dark:bg-amber-500/10 rounded-t-sm" style={{ height: `${h}%` }}>
                  <div className="w-full bg-amber-500 h-1 rounded-t-sm" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 4: Top Financial Risks */}
      <div className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top Financial Risks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" /> Overdue AR
              </div>
              <div className="text-2xl font-bold">$125K</div>
              <p className="text-xs text-muted-foreground">3 invoices &gt; 60 days overdue</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning border-l-amber-500">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-500">
                <AlertTriangle className="h-4 w-4" /> Unreconciled Accounts
              </div>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">Main Operating & Payroll accounts</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning border-l-amber-500">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-500">
                <AlertTriangle className="h-4 w-4" /> Open Close Tasks
              </div>
              <div className="text-2xl font-bold">14</div>
              <p className="text-xs text-muted-foreground">Blocking June month-end close</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-muted">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" /> Cash Forecast
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">Positive</div>
              <p className="text-xs text-muted-foreground">No cash flow gaps in 30 days</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
