export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getReceivablesAging } from "@/lib/finance/receivables-aging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardBarChart } from "@/components/ui/chart-wrappers";
import { formatINR } from "@/lib/currency";
import {
  EnterprisePage,
  EnterprisePageHeader,
  EnterpriseKPIRow,
  EnterpriseStatCard,
  EnterprisePrintButton,
  EnterpriseEmptyState,
} from "@/components/enterprise";
import { AgingTable, type AgingRow } from "./aging-table";

export default async function AgingReportPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");

  const aging = await getReceivablesAging(businessId);
  const { totals, kpis } = aging;

  const distribution = [
    { bucket: "Current", amount: Math.round(totals.current) },
    { bucket: "1–30", amount: Math.round(totals.d1_30) },
    { bucket: "31–60", amount: Math.round(totals.d31_60) },
    { bucket: "61–90", amount: Math.round(totals.d61_90) },
    { bucket: "91–120", amount: Math.round(totals.d91_120) },
    { bucket: "120+", amount: Math.round(totals.d120plus) },
  ];

  const rows: AgingRow[] = aging.perCustomer.map((c) => ({
    customer: c.name,
    code: c.code,
    current: Math.round(c.current),
    d1_30: Math.round(c.d1_30),
    d31_60: Math.round(c.d31_60),
    d61_90: Math.round(c.d61_90),
    d91_120: Math.round(c.d91_120),
    d120plus: Math.round(c.d120plus),
    total: Math.round(c.total),
  }));

  return (
    <EnterprisePage>
      <EnterprisePageHeader
        title="Aging Report"
        description="Outstanding receivables bucketed by days past due."
        actions={<EnterprisePrintButton />}
      />

      <EnterpriseKPIRow className="lg:grid-cols-5">
        <EnterpriseStatCard title="Outstanding" value={formatINR(kpis.outstanding)} />
        <EnterpriseStatCard title="Overdue" value={formatINR(kpis.overdue)} variant={kpis.overdue > 0 ? "destructive" : "default"} />
        <EnterpriseStatCard title="Collection %" value={kpis.collectionRate != null ? `${Math.round(kpis.collectionRate * 100)}%` : "—"} />
        <EnterpriseStatCard title="Avg Days Outstanding" value={kpis.avgDaysOutstanding != null ? `${kpis.avgDaysOutstanding}d` : "—"} />
        <EnterpriseStatCard title="Expected Collections" value={formatINR(kpis.expectedCollections)} />
      </EnterpriseKPIRow>

      {totals.total === 0 ? (
        <EnterpriseEmptyState title="No outstanding receivables" description="All customer invoices are settled." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <StandardBarChart
              className="lg:col-span-2"
              title="Aging distribution"
              data={distribution}
              xAxisKey="bucket"
              series={[{ key: "amount", color: "var(--primary)" }]}
              height={260}
            />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Top overdue customers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {aging.topOverdue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No overdue customers.</p>
                ) : (
                  aging.topOverdue.map((c) => (
                    <div key={c.customerId} className="flex items-center justify-between text-sm">
                      <span className="truncate pr-2 font-medium">{c.name}</span>
                      <span className="tabular-nums text-destructive">{formatINR(c.overdue)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <StandardBarChart
            title="Monthly collections"
            data={aging.monthlyCollections}
            xAxisKey="month"
            series={[{ key: "amount", color: "var(--success)" }]}
            height={220}
          />

          <div className="flex-1 overflow-hidden">
            <AgingTable data={rows} />
          </div>
        </>
      )}
    </EnterprisePage>
  );
}
