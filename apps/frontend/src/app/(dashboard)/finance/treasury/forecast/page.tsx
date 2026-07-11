export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function CashForecastPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const [accounts, receivables, payables] = await Promise.all([
    db.bankAccount.findMany({ where: { businessId } }),
    db.receivableEntry.findMany({ where: { businessId, status: { not: "CLOSED" } } }),
    db.payableEntry.findMany({ where: { businessId, status: { not: "PAID" } } }),
  ]);

  const opening = accounts.reduce((s, a) => s + a.openingBalance.toNumber(), 0);
  const openAR = receivables.reduce((s, r) => s + (r.amount.toNumber() - r.paidAmount.toNumber()), 0);
  const openAP = payables.reduce((s, p) => s + (p.amount.toNumber() - p.paidAmount.toNumber()), 0);

  // 4-week rolling forecast: expected collections and payments spread across the horizon.
  const weeks = [0.4, 0.3, 0.2, 0.1];
  let running = opening;
  const rows = weeks.map((w, i) => {
    const inflow = Math.round(openAR * w);
    const outflow = Math.round(openAP * w);
    running += inflow - outflow;
    return { label: `Week ${i + 1}`, inflow, outflow, closing: running };
  });
  const projectedClose = running;

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Cash Forecast" description="4-week rolling forecast from opening cash, expected collections, and payments." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Opening Cash" value={formatINR(opening)} freshness="Live" />
        <KPICard title="Expected Collections" value={formatINR(openAR)} variant="success" freshness="Live" />
        <KPICard title="Projected Close (4wk)" value={formatINR(projectedClose)} variant={projectedClose >= 0 ? "success" : "destructive"} freshness="Live" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Horizon</th>
                <th className="p-3 font-medium text-right">Expected In</th>
                <th className="p-3 font-medium text-right">Expected Out</th>
                <th className="p-3 font-medium text-right">Projected Cash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.label} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{r.label}</td>
                  <td className="p-3 text-right tabular-nums text-emerald-600 dark:text-emerald-500">+{formatINR(r.inflow)}</td>
                  <td className="p-3 text-right tabular-nums text-rose-600 dark:text-rose-500">-{formatINR(r.outflow)}</td>
                  <td className="p-3 text-right tabular-nums font-medium">{formatINR(r.closing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}
