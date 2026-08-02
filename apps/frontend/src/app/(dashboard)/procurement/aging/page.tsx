export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getPayablesAging } from "@/lib/finance/payables-aging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardBarChart } from "@/components/ui/chart-wrappers";
import { formatINR } from "@/lib/currency";
import {
  EnterprisePage,
  EnterprisePageHeader,
  EnterpriseKPIRow,
  EnterpriseStatCard,
  EnterpriseEmptyState,
  EnterpriseReportTable,
  type ReportColumn,
  type ReportRow,
} from "@/components/enterprise";

const COLUMNS: ReportColumn[] = [
  { key: "supplier", header: "Supplier" },
  { key: "current", header: "Current", format: "money" },
  { key: "d1_30", header: "1–30", format: "money" },
  { key: "d31_60", header: "31–60", format: "money" },
  { key: "d61_90", header: "61–90", format: "money" },
  { key: "d91_120", header: "91–120", format: "money" },
  { key: "d120plus", header: "120+", format: "money" },
  { key: "total", header: "Total", format: "money" },
];

export default async function PayablesAgingPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");

  const aging = await getPayablesAging(businessId);
  const { totals, kpis } = aging;

  const distribution = [
    { bucket: "Current", amount: Math.round(totals.current) },
    { bucket: "1–30", amount: Math.round(totals.d1_30) },
    { bucket: "31–60", amount: Math.round(totals.d31_60) },
    { bucket: "61–90", amount: Math.round(totals.d61_90) },
    { bucket: "91–120", amount: Math.round(totals.d91_120) },
    { bucket: "120+", amount: Math.round(totals.d120plus) },
  ];

  const rows: ReportRow[] = aging.perSupplier.map((s) => ({
    supplier: s.name,
    current: Math.round(s.current),
    d1_30: Math.round(s.d1_30),
    d31_60: Math.round(s.d31_60),
    d61_90: Math.round(s.d61_90),
    d91_120: Math.round(s.d91_120),
    d120plus: Math.round(s.d120plus),
    total: Math.round(s.total),
  }));

  return (
    <EnterprisePage>
      <EnterprisePageHeader title="AP Aging" description="Outstanding payables bucketed by days past due." />

      <EnterpriseKPIRow className="lg:grid-cols-5">
        <EnterpriseStatCard title="Outstanding" value={formatINR(kpis.outstanding)} />
        <EnterpriseStatCard title="Overdue" value={formatINR(kpis.overdue)} variant={kpis.overdue > 0 ? "destructive" : "default"} />
        <EnterpriseStatCard title="Payment %" value={kpis.paymentRate != null ? `${Math.round(kpis.paymentRate * 100)}%` : "—"} />
        <EnterpriseStatCard title="Avg Days Outstanding" value={kpis.avgDaysOutstanding != null ? `${kpis.avgDaysOutstanding}d` : "—"} />
        <EnterpriseStatCard title="Due Soon" value={formatINR(kpis.expectedPayments)} />
      </EnterpriseKPIRow>

      {totals.total === 0 ? (
        <EnterpriseEmptyState title="No outstanding payables" description="All supplier bills are settled." />
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
                <CardTitle className="text-base font-medium">Top overdue suppliers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {aging.topOverdue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No overdue suppliers.</p>
                ) : (
                  aging.topOverdue.map((s) => (
                    <div key={s.supplierId} className="flex items-center justify-between text-sm">
                      <span className="truncate pr-2 font-medium">{s.name}</span>
                      <span className="tabular-nums text-destructive">{formatINR(s.overdue)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex-1 overflow-hidden">
            <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search suppliers…" />
          </div>
        </>
      )}
    </EnterprisePage>
  );
}
