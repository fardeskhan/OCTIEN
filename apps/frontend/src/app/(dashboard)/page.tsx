// @ts-nocheck
export const dynamic = 'force-dynamic';
// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, AlertCircle, ShoppingCart, Activity } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,234.50</div>
            <p className="text-xs text-muted-foreground">+4% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$142,500.00</div>
            <p className="text-xs text-muted-foreground">Across 4 warehouses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending POs</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Requires receiving</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "Stock Adjusted", target: "Used Cooking Oil", time: "2 hours ago" },
                { action: "PO Approved", target: "Glass Bottles (500ml)", time: "4 hours ago" },
                { action: "Expense Recorded", target: "Vehicle Maintenance", time: "5 hours ago" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium leading-none">{item.action}</p>
                    <p className="text-sm text-muted-foreground">{item.target}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">{item.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {[
                { name: "Salam Cola Labels", current: 500, min: 1000 },
                { name: "Sofa Frame - Oak", current: 2, min: 5 },
              ].map((item, i) => (
                <div key={i} className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-sm font-bold text-red-500">{item.current} left</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum threshold: {item.min}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs, WorkspaceGrid } from "@/components/layout/page-layout"
import { WorkspaceLayout as NewWorkspaceLayout, WorkspaceHeader as NewWorkspaceHeader, WorkspaceKPIs as NewWorkspaceKPIs } from "@/components/layout/workspace-layout"
import { KPICard } from "@/components/ui/kpi-card"
import { AlertCard } from "@/components/ui/alert-card"
import { BusinessComparisonCard } from "@/components/ui/business-comparison-card"
import { StandardAreaChart, StandardBarChart } from "@/components/ui/chart-wrappers"
import { getGroupDashboardData } from "./_data/dashboard-fetchers"

// Next.js config
export const dynamic = 'force-dynamic'

function formatCurrency(val: number) {
  if (val >= 1000000) return "\{(val / 1000000).toFixed(1)}M"
  if (val >= 1000) return "\{(val / 1000).toFixed(1)}K"
  return "\{val.toFixed(0)}"
}

export default async function GroupDashboardPage() {
  const data = await getGroupDashboardData('tenant-1').catch(() => ({ scorecard: [], cashFlowData: [] }))
  
  // Calculate group aggregates from scorecard if available
  let totalRev = 0, totalProfit = 0, totalCash = 0, totalAR = 0, totalAP = 0
  data.scorecard.forEach(b => {
    totalRev += Number(b.revenue || 0)
    totalProfit += Number(b.profit || 0)
    totalCash += Number(b.cash || 0)
    totalAR += Number(b.openAR || 0)
    totalAP += Number(b.openAP || 0)
  })

  // If no DB data, provide some mock numbers
  if (data.scorecard.length === 0) {
    totalRev = 12400000; totalProfit = 2100000; totalCash = 5400000; totalAR = 3200000; totalAP = 1800000;
  }

  const comparisonMetrics = [
    {
      name: "Revenue",
      businesses: [
        { name: "Salam Cola", value: formatCurrency(totalRev * 0.7), colorClass: "text-foreground" },
        { name: "UCO", value: formatCurrency(totalRev * 0.3), colorClass: "text-foreground" }
      ]
    },
    {
      name: "Net Profit",
      businesses: [
        { name: "Salam Cola", value: formatCurrency(totalProfit * 0.65), colorClass: "text-success" },
        { name: "UCO", value: formatCurrency(totalProfit * 0.35), colorClass: "text-success" }
      ]
    },
    {
      name: "Cash Position",
      businesses: [
        { name: "Salam Cola", value: formatCurrency(totalCash * 0.8), colorClass: "text-foreground" },
        { name: "UCO", value: formatCurrency(totalCash * 0.2), colorClass: "text-foreground" }
      ]
    },
    {
      name: "Open Receivables",
      businesses: [
        { name: "Salam Cola", value: formatCurrency(totalAR * 0.85), colorClass: "text-warning" },
        { name: "UCO", value: formatCurrency(totalAR * 0.15), colorClass: "text-warning" }
      ]
    }
  ]

  const freshness = "Updated 1 min ago"

  return (
    <NewWorkspaceLayout>
      <NewWorkspaceHeader title="Aeterex Group" description="Consolidated Executive View" />

      {/* ROW 1: Exceptions First */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AlertCard title="Overdue Receivables" value=".2M" variant="warning" action={<span className="text-sm underline cursor-pointer">View Aging</span>} />
        <AlertCard title="Compliance Issues" value="2 Failures" variant="critical" action={<span className="text-sm underline cursor-pointer">Review IRNs</span>} />
        <AlertCard title="Cash Risk" value="Low" variant="info" action={<span className="text-sm underline cursor-pointer">View Forecast</span>} />
        <AlertCard title="Pending Approvals" value="14" variant="info" action={<span className="text-sm underline cursor-pointer">Review</span>} />
      </div>

      {/* ROW 2: Financial Health */}
      <NewWorkspaceKPIs>
        <KPICard title="Total Revenue" value={formatCurrency(totalRev)} trend={12} freshness={freshness} />
        <KPICard title="Net Profit" value={formatCurrency(totalProfit)} trend={8} freshness={freshness} />
        <KPICard title="Cash Position" value={formatCurrency(totalCash)} trend={-2} freshness={freshness} />
        <KPICard title="Open Receivables" value={formatCurrency(totalAR)} trend={15} trendLabel="Needs Attention" freshness={freshness} />
      </NewWorkspaceKPIs>

      {/* ROW 3: Treasury & Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <StandardAreaChart 
            title="Consolidated Cash Flow (30 Days)" 
            data={data.cashFlowData.length ? data.cashFlowData : Array.from({length:30}).map((_,i)=>({date:i, cash:5000}))} 
            xAxisKey="date" 
            series={[{ key: "cash", color: "var(--info)" }]} 
            height={280} 
          />
        </div>
        <div>
          <BusinessComparisonCard title="Business Unit Comparison" metrics={comparisonMetrics} className="h-full" />
        </div>
      </div>
    </NewWorkspaceLayout>
  )
}
