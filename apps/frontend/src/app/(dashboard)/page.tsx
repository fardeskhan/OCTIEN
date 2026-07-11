export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/server-auth";
import { db } from "@/lib/db";
import {
  WorkspaceLayout,
  WorkspaceHeader,
  WorkspaceKPIs,
} from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { AlertCard } from "@/components/ui/alert-card";
import { BusinessComparisonCard } from "@/components/ui/business-comparison-card";
import Link from "next/link";
import { FilePlus2, UserPlus, PackagePlus, ShoppingCart, Building2, ScrollText } from "lucide-react";
import { StandardBarChart } from "@/components/ui/chart-wrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getGroupDashboardData } from "./_data/dashboard-fetchers";
import { getGroupAnalytics, getActivityAndDocs } from "./_data/dashboard-analytics";
import { formatINRCompact, formatINR } from "@/lib/currency";

const QUICK_ACTIONS = [
  { label: "New Invoice", href: "/sales/invoices/new", icon: FilePlus2 },
  { label: "New Customer", href: "/sales/customers/new", icon: UserPlus },
  { label: "New Product", href: "/inventory/products/new", icon: PackagePlus },
  { label: "Create PO", href: "/operations/procurement/orders/new", icon: ShoppingCart },
  { label: "Businesses", href: "/business", icon: Building2 },
  { label: "Audit Trail", href: "/governance/audit/trail", icon: ScrollText },
];

type ScorecardRow = {
  businessId: string;
  businessName: string;
  revenue: number;
  profit: number;
  cash: number;
  openAR: number;
  openAP: number;
};

const formatCurrency = formatINRCompact;

export default async function GroupDashboardPage() {
  // Real auth + tenant context (no stub, no hardcoded tenant id).
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  const tenantId = user?.tenantId;

  // Real per-business figures from DashboardService; empty (not mocked) on failure.
  const raw = tenantId
    ? await getGroupDashboardData(tenantId).catch(() => ({ scorecard: [] }))
    : { scorecard: [] };

  const scorecard: ScorecardRow[] = (raw.scorecard ?? []).map((b: Record<string, unknown>) => ({
    businessId: String(b.businessId ?? ""),
    businessName: String(b.businessName ?? "Unknown"),
    revenue: Number(b.revenue ?? 0),
    profit: Number(b.profit ?? 0),
    cash: Number(b.cash ?? 0),
    openAR: Number(b.openAR ?? 0),
    openAP: Number(b.openAP ?? 0),
  }));

  const hasData = scorecard.length > 0;

  const analytics = tenantId
    ? await getGroupAnalytics(tenantId).catch(() => ({ arAging: [], apAging: [], topCustomers: [], topProducts: [] }))
    : { arAging: [], apAging: [], topCustomers: [], topProducts: [] };

  const feed = tenantId
    ? await getActivityAndDocs(tenantId).catch(() => ({ activity: [], docs: [] }))
    : { activity: [], docs: [] };

  const totals = scorecard.reduce(
    (acc, b) => {
      acc.revenue += b.revenue;
      acc.profit += b.profit;
      acc.cash += b.cash;
      acc.openAR += b.openAR;
      acc.openAP += b.openAP;
      return acc;
    },
    { revenue: 0, profit: 0, cash: 0, openAR: 0, openAP: 0 },
  );

  // Real per-business comparison (no synthetic 70/30 splits).
  const metricDefs: { name: string; get: (b: ScorecardRow) => number; color: string }[] = [
    { name: "Revenue", get: (b) => b.revenue, color: "text-foreground" },
    { name: "Net Profit", get: (b) => b.profit, color: "text-success" },
    { name: "Cash Position", get: (b) => b.cash, color: "text-foreground" },
    { name: "Open Receivables", get: (b) => b.openAR, color: "text-warning" },
  ];

  const comparisonMetrics = metricDefs.map((m) => ({
    name: m.name,
    businesses: scorecard.map((b) => ({
      name: b.businessName,
      value: formatCurrency(m.get(b)),
      colorClass: m.color,
    })),
  }));

  const perBusiness = scorecard.map((b) => ({
    name: b.businessName,
    revenue: b.revenue,
    profit: b.profit,
  }));

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Group Dashboard"
        description="Consolidated executive view across all businesses"
        actions={
          <div className="hidden flex-wrap gap-2 lg:flex">
            {QUICK_ACTIONS.slice(0, 4).map((a) => (
              <Link key={a.label} href={a.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <a.icon className="h-4 w-4" /> {a.label}
              </Link>
            ))}
          </div>
        }
      />

      {/* Row 1 — Financial position (real) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AlertCard title="Open Receivables" value={formatCurrency(totals.openAR)} variant="warning" />
        <AlertCard title="Open Payables" value={formatCurrency(totals.openAP)} variant="info" />
        <AlertCard title="Cash Position" value={formatCurrency(totals.cash)} variant="info" />
        <AlertCard title="Businesses Tracked" value={scorecard.length} variant="info" />
      </div>

      {/* Row 2 — Group KPIs (real) */}
      <WorkspaceKPIs>
        <KPICard title="Total Revenue" value={formatCurrency(totals.revenue)} freshness="Live" />
        <KPICard title="Net Profit" value={formatCurrency(totals.profit)} freshness="Live" />
        <KPICard title="Cash Position" value={formatCurrency(totals.cash)} freshness="Live" />
        <KPICard
          title="Net Working Capital"
          value={formatCurrency(totals.openAR - totals.openAP)}
          freshness="Live"
        />
      </WorkspaceKPIs>

      {/* Row 3 — Performance + comparison (real) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {hasData ? (
            <StandardBarChart
              title="Revenue vs. Net Profit by Business"
              data={perBusiness}
              xAxisKey="name"
              height={280}
              series={[
                { key: "revenue", color: "var(--info)" },
                { key: "profit", color: "var(--success)" },
              ]}
            />
          ) : (
            <div className="h-[280px] flex items-center justify-center rounded-md border border-border bg-card text-sm text-muted-foreground text-center px-6">
              No business performance data yet. Figures appear once a business has an open
              accounting period with activity.
            </div>
          )}
        </div>
        <div>
          {hasData ? (
            <BusinessComparisonCard
              title="Business Unit Comparison"
              metrics={comparisonMetrics}
              className="h-full"
            />
          ) : (
            <div className="h-full min-h-[200px] flex items-center justify-center rounded-md border border-border bg-card text-sm text-muted-foreground">
              No businesses to compare yet.
            </div>
          )}
        </div>
      </div>

      {/* Row 4 — Receivables & Payables aging (real) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgingCard title="Receivables Aging" buckets={analytics.arAging} accent="var(--warning)" />
        <AgingCard title="Payables Aging" buckets={analytics.apAging} accent="var(--info)" />
      </div>

      {/* Row 4.5 — Activity feed + recent documents (real) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Recent Activity</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {feed.activity.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No activity yet — actions across the ERP appear here.</div>
            ) : (
              feed.activity.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    <span>{a.resource}</span>
                    {a.detail && <span className="ml-1 font-mono text-xs text-muted-foreground">{a.detail}</span>}
                  </div>
                  <div className="ml-3 shrink-0 text-right text-xs text-muted-foreground">
                    <div>{a.business}</div>
                    <div>{a.when.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Recent Documents</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {feed.docs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No documents yet.</div>
            ) : (
              feed.docs.map((d) => (
                <Link key={`${d.kind}-${d.code}`} href={d.href} className="flex items-center justify-between p-3 text-sm transition-colors hover:bg-muted/30">
                  <div>
                    <div className="font-medium">{d.code}</div>
                    <div className="text-xs text-muted-foreground">{d.kind} · {d.party}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{formatINR(d.amount)}</div>
                    <div className="text-xs text-muted-foreground">{d.when.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 5 — Top customers & products (real) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Top Customers by Outstanding</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {analytics.topCustomers.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No outstanding receivables.</div>
            ) : (
              analytics.topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                    <span className="text-sm">{c.name}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatINR(c.value)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Top Products by Inventory Value</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {analytics.topProducts.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No inventory on hand.</div>
            ) : (
              analytics.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                    <span className="text-sm">{p.name}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatINR(p.value)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </WorkspaceLayout>
  );
}

function AgingCard({ title, buckets, accent }: { title: string; buckets: { label: string; amount: number }[]; accent: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.amount));
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm font-semibold tabular-nums">{formatINR(total)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {buckets.map((b) => (
          <div key={b.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="tabular-nums font-medium">{formatINR(b.amount)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(b.amount / max) * 100}%`, backgroundColor: accent }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
