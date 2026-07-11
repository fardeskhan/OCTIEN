export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function CashPositionPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const [accounts, tx] = await Promise.all([
    db.bankAccount.findMany({ where: { businessId } }),
    db.cashTransaction.findMany({ where: { businessId }, orderBy: { occurredAt: "desc" } }),
  ]);

  const cashIn = tx.filter((t) => t.type === "CASH_IN").reduce((s, t) => s + t.amount.toNumber(), 0);
  const cashOut = tx.filter((t) => t.type === "CASH_OUT").reduce((s, t) => s + t.amount.toNumber(), 0);
  const position = accounts.reduce((s, a) => s + a.openingBalance.toNumber(), 0);

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Cash Position" description="Consolidated cash across bank accounts, with inflow/outflow." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Cash Position" value={formatINR(position)} freshness="Live" />
        <KPICard title="Cash In (period)" value={formatINR(cashIn)} variant="success" freshness="Live" />
        <KPICard title="Cash Out (period)" value={formatINR(cashOut)} variant="destructive" freshness="Live" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Account</th>
                <th className="p-3 font-medium">Currency</th>
                <th className="p-3 font-medium text-right">Balance</th>
                <th className="p-3 font-medium text-right">% of Cash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No bank accounts configured.</td></tr>
              ) : (
                accounts.map((a) => {
                  const bal = a.openingBalance.toNumber();
                  return (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{a.name}</td>
                      <td className="p-3 text-muted-foreground">INR</td>
                      <td className="p-3 text-right tabular-nums font-medium">{formatINR(bal)}</td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">{position ? ((bal / position) * 100).toFixed(0) : 0}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}
