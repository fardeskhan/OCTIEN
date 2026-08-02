export const dynamic = "force-dynamic";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getSalesDashboard } from "@/lib/sales/sales-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardBarChart, StandardLineChart } from "@/components/ui/chart-wrappers";
import { formatINR } from "@/lib/currency";
import { formatNumber } from "@/lib/utils";
import { EnterprisePage, EnterprisePageHeader, EnterpriseKPIRow, EnterpriseStatCard } from "@/components/enterprise";

function ListCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : (
          rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="truncate pr-2 font-medium">{r.label}</span>
              <span className="tabular-nums text-muted-foreground">{r.value}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

const NAV = [
  ["Overview", "/sales/dashboard"],
  ["Customers", "/sales/customers"],
  ["Quotations", "/sales/quotations"],
  ["Orders", "/sales/orders"],
  ["Deliveries", "/sales/deliveries"],
  ["Aging", "/sales/aging"],
] as const;

export default async function SalesDashboardPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");

  const d = await getSalesDashboard(businessId);
  const { kpis, operations, aging } = d;

  const distribution = [
    { bucket: "Current", amount: Math.round(aging.totals.current) },
    { bucket: "1–30", amount: Math.round(aging.totals.d1_30) },
    { bucket: "31–60", amount: Math.round(aging.totals.d31_60) },
    { bucket: "61–90", amount: Math.round(aging.totals.d61_90) },
    { bucket: "91–120", amount: Math.round(aging.totals.d91_120) },
    { bucket: "120+", amount: Math.round(aging.totals.d120plus) },
  ];

  return (
    <EnterprisePage>
      <EnterprisePageHeader title="Sales Dashboard" description="Live sales performance, receivables and operations." />

      <div className="flex flex-wrap gap-4 border-b border-border pb-3 text-sm font-medium">
        {NAV.map(([label, href]) => (
          <Link key={href} href={href} className={href === "/sales/dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"}>
            {label}
          </Link>
        ))}
      </div>

      {/* Alerts */}
      {d.alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {d.alerts.map((a, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
                a.tone === "danger"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : a.tone === "warning"
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "border-border bg-muted text-muted-foreground"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" /> {a.label}: {a.value}
            </span>
          ))}
        </div>
      )}

      {/* Row 1 — Executive KPIs */}
      <EnterpriseKPIRow className="lg:grid-cols-5">
        <EnterpriseStatCard title="Revenue (Invoiced)" value={formatINR(kpis.revenue)} />
        <EnterpriseStatCard title="Orders" value={formatNumber(kpis.orders)} />
        <EnterpriseStatCard title="Shipments" value={formatNumber(kpis.shipments)} />
        <EnterpriseStatCard title="Invoices" value={formatNumber(kpis.invoices)} />
        <EnterpriseStatCard title="Payments" value={formatINR(kpis.payments)} />
        <EnterpriseStatCard title="Outstanding AR" value={formatINR(kpis.outstandingAR)} />
        <EnterpriseStatCard title="Overdue AR" value={formatINR(kpis.overdueAR)} variant={kpis.overdueAR > 0 ? "destructive" : "default"} />
        <EnterpriseStatCard title="Collection %" value={kpis.collectionRate != null ? `${Math.round(kpis.collectionRate * 100)}%` : "—"} />
        <EnterpriseStatCard title="Avg Order Value" value={formatINR(kpis.avgOrderValue)} />
      </EnterpriseKPIRow>

      {/* Row 2 — Trends */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StandardBarChart title="Revenue trend" data={d.trends} xAxisKey="month" series={[{ key: "revenue", color: "var(--primary)" }]} height={240} />
        <StandardLineChart title="Collections trend" data={d.trends} xAxisKey="month" series={[{ key: "collected", color: "var(--success)" }]} height={240} />
      </div>

      {/* Row 3 — Receivables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StandardBarChart className="lg:col-span-2" title="Aging distribution" data={distribution} xAxisKey="bucket" series={[{ key: "amount", color: "var(--primary)" }]} height={220} />
        <ListCard title="Top overdue customers" rows={aging.topOverdue.map((c) => ({ label: c.name, value: formatINR(c.overdue) }))} />
      </div>

      {/* Row 4 — Operations */}
      <EnterpriseKPIRow className="lg:grid-cols-6">
        <EnterpriseStatCard title="Pending Quotations" value={formatNumber(operations.pendingQuotations)} />
        <EnterpriseStatCard title="Pending Orders" value={formatNumber(operations.pendingOrders)} />
        <EnterpriseStatCard title="Picking" value={formatNumber(operations.picking)} />
        <EnterpriseStatCard title="Packing" value={formatNumber(operations.packing)} />
        <EnterpriseStatCard title="Dispatched Today" value={formatNumber(operations.dispatchedToday)} />
        <EnterpriseStatCard title="Delivered Today" value={formatNumber(operations.deliveredToday)} />
      </EnterpriseKPIRow>

      {/* Row 5 — Top lists */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ListCard title="Top customers" rows={d.topCustomers.map((c) => ({ label: c.name, value: formatINR(c.amount) }))} />
        <ListCard title="Top products" rows={d.topProducts.map((p) => ({ label: p.name, value: formatINR(p.amount) }))} />
        <ListCard title="Largest outstanding" rows={d.largestOutstanding.map((c) => ({ label: c.name, value: formatINR(c.amount) }))} />
        <ListCard title="Recent sales" rows={d.recentSales.map((s) => ({ label: `${s.code} · ${s.customer}`, value: formatINR(s.amount) }))} />
      </div>
    </EnterprisePage>
  );
}
