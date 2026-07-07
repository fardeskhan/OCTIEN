// @ts-nocheck

import { requireBusinessContext } from "@/lib/auth/context";
import { DashboardService } from "@/lib/dashboard/dashboard-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Activity, ArrowUpRight, ArrowDownRight, Users, Box, CreditCard, DollarSign } from "lucide-react";

export default async function DashboardPage() {
  const { businessId } = await requireBusinessContext();
  const data = await DashboardService.getExecutiveDashboard(businessId);

  // Formatting utilities
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Executive Dashboard</h2>
      </div>

      {/* Row 1: Executive KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/finance/pnl">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue (MTD)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.revenue)}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/finance/pnl">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses (MTD)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.expenses)}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/finance/pnl">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Operating Profit</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.profit)}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/finance/cash">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full bg-slate-900 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Cash Position</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(data.cashPosition)}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Row 2: Working Capital */}
      <h3 className="text-xl font-semibold mt-8 mb-4 tracking-tight">Working Capital</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/finance/invoices">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600">Open AR</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.openAR)}</div>
              <p className="text-xs text-rose-500 mt-1">{formatCurrency(data.overdueAR)} Overdue</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/finance/bills">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-rose-600">Open AP</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.openAP)}</div>
              <p className="text-xs text-rose-500 mt-1">{formatCurrency(data.overdueAP)} Overdue</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/logistics/inventory">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <Box className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.inventoryValue)}</div>
            </CardContent>
          </Card>
        </Link>
        <Card className="h-full bg-slate-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Net Working Capital</CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">{formatCurrency(data.netWorkingCapital)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        {/* Row 3: Management KPIs (spans 4 columns) */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Management Overview</CardTitle>
            <CardDescription>Budget and Cost Center Performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Budget Utilization</span>
                <span className="text-sm text-muted-foreground">{data.budgetUtilizationPercent.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(data.budgetUtilizationPercent, 100)} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Top Revenue Center</p>
                {data.topCostCenters.length > 0 ? (
                  <p className="text-lg font-semibold">{data.topCostCenters[0].path} <span className="text-emerald-600 text-sm font-normal">({formatCurrency(data.topCostCenters[0].revenue)})</span></p>
                ) : (
                  <p className="text-sm text-slate-500">No data</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Top Expense Center</p>
                {data.topCostCenters.length > 1 ? (
                  <p className="text-lg font-semibold">{data.topCostCenters[1].path} <span className="text-rose-600 text-sm font-normal">({formatCurrency(data.topCostCenters[1].expenses)})</span></p>
                ) : (
                  <p className="text-sm text-slate-500">No data</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 4: Operational (spans 3 columns) */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Latest customer billing activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentInvoices.map((inv) => (
                <div key={inv.code} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{inv.code}</p>
                  </div>
                  <div className="font-medium">{formatCurrency(inv.totalAmount)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

