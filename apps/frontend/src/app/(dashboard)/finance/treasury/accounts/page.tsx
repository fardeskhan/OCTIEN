export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function BankAccountsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const [accounts, cashTx] = await Promise.all([
    db.bankAccount.findMany({ where: { businessId } }),
    db.cashTransaction.findMany({ where: { businessId } }),
  ]);

  const net = cashTx.reduce((s, t) => s + (t.type === "CASH_IN" ? t.amount.toNumber() : -t.amount.toNumber()), 0);
  const totalOpening = accounts.reduce((s, a) => s + a.openingBalance.toNumber(), 0);

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Bank Accounts" description="Treasury — bank accounts and current cash position." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Bank Accounts" value={accounts.length} freshness="Live" />
        <KPICard title="Total Cash Position" value={formatINR(totalOpening)} freshness="Live" />
        <KPICard title="Net Cash Movement" value={formatINR(net)} variant={net >= 0 ? "success" : "destructive"} freshness="Live" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Account</th>
                <th className="p-3 font-medium">Account No.</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No bank accounts configured.</td></tr>
              ) : (
                accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{a.name}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{a.accountNumber}</td>
                    <td className="p-3"><Badge variant={a.status === "ACTIVE" ? "default" : "secondary"}>{a.status}</Badge></td>
                    <td className="p-3 text-right tabular-nums font-medium">{formatINR(a.openingBalance.toNumber())}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}
