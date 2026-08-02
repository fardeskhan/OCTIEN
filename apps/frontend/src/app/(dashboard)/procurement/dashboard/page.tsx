export const dynamic = "force-dynamic";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getProcurementDashboard } from "@/lib/procurement/procurement-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardBarChart, StandardLineChart } from "@/components/ui/chart-wrappers";
import { formatINR } from "@/lib/currency";
import { formatNumber } from "@/lib/utils";
import { EnterprisePage, EnterprisePageHeader, EnterpriseKPIRow, EnterpriseStatCard } from "@/components/enterprise";

function ListCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-medium">{title}</CardTitle></CardHeader>
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
  ["Overview", "/procurement/dashboard"],
  ["Suppliers", "/procurement/suppliers"],
  ["Aging", "/procurement/aging"],
  ["Reports", "/procurement/reports"],
] as const;

export default async function ProcurementDashboardPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");

  const d = await getProcurementDashboard(businessId);
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
      <EnterprisePageHeader title="Procurement Dashboard" description="Live purchasing, payables and operations." />

      <div className="flex flex-wrap gap-4 border-b border-border pb-3 text-sm font-medium">
        {NAV.map(([label, href]) => (
          <Link key={href} href={href} className={href === "/procurement/dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"}>
            {label}
          </Link>
        ))}
      </div>

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
      <EnterpriseKPIRow className="lg:grid-cols-4">
        <EnterpriseStatCard title="Purchase Spend" value={formatINR(kpis.purchaseSpend)} />
        <EnterpriseStatCard title="Purchase Orders" value={formatNumber(kpis.purchaseOrders)} />
        <EnterpriseStatCard title="Goods Receipts" value={formatNumber(kpis.goodsReceipts)} />
        <EnterpriseStatCard title="Vendor Bills" value={formatNumber(kpis.vendorBills)} />
        <EnterpriseStatCard title="Payments" value={formatINR(kpis.payments)} />
        <EnterpriseStatCard title="Outstanding AP" value={formatINR(kpis.outstandingAP)} />
        <EnterpriseStatCard title="Overdue AP" value={formatINR(kpis.overdueAP)} variant={kpis.overdueAP > 0 ? "destructive" : "default"} />
        <EnterpriseStatCard title="Avg Payment Days" value={kpis.avgPaymentDays != null ? `${kpis.avgPaymentDays}d` : "—"} />
      </EnterpriseKPIRow>

      {/* Row 2 — Trends */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StandardBarChart title="Purchase trend" data={d.trends} xAxisKey="month" series={[{ key: "purchases", color: "var(--primary)" }]} height={240} />
        <StandardLineChart title="Payments trend" data={d.trends} xAxisKey="month" series={[{ key: "paid", color: "var(--success)" }]} height={240} />
      </div>

      {/* Row 3 — Payables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StandardBarChart className="lg:col-span-2" title="AP aging distribution" data={distribution} xAxisKey="bucket" series={[{ key: "amount", color: "var(--primary)" }]} height={220} />
        <ListCard title="Top overdue suppliers" rows={aging.topOverdue.map((s) => ({ label: s.name, value: formatINR(s.overdue) }))} />
      </div>

      {/* Row 4 — Operations */}
      <EnterpriseKPIRow className="lg:grid-cols-4">
        <EnterpriseStatCard title="Pending Requisitions" value={formatNumber(operations.pendingRequisitions)} />
        <EnterpriseStatCard title="Pending Orders" value={formatNumber(operations.pendingPurchaseOrders)} />
        <EnterpriseStatCard title="Pending Receipts" value={formatNumber(operations.pendingReceipts)} />
        <EnterpriseStatCard title="Bills Awaiting Approval" value={formatNumber(operations.billsAwaitingApproval)} />
      </EnterpriseKPIRow>

      {/* Row 5 — Top lists */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ListCard title="Top suppliers (spend)" rows={d.topSuppliers.map((s) => ({ label: s.name, value: formatINR(s.amount) }))} />
        <ListCard title="Largest outstanding" rows={d.largestOutstanding.map((s) => ({ label: s.name, value: formatINR(s.amount) }))} />
        <ListCard title="Recent purchases" rows={d.recentPurchases.map((p) => ({ label: `${p.code} · ${p.supplier}`, value: formatINR(p.amount) }))} />
      </div>
    </EnterprisePage>
  );
}
