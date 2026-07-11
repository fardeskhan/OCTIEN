export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintButton } from "@/components/finance/print-button";

export default async function GeneralLedgerPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const [accounts, lines] = await Promise.all([
    db.ledgerAccount.findMany({ where: { businessId }, orderBy: { accountCode: "asc" } }),
    db.journalLine.findMany({ where: { businessId }, include: { journalEntry: { select: { date: true, description: true } } }, orderBy: { journalEntry: { date: "asc" } } }),
  ]);

  const byAccount = new Map<string, typeof lines>();
  for (const l of lines) {
    const arr = byAccount.get(l.accountId) ?? [];
    arr.push(l);
    byAccount.set(l.accountId, arr);
  }

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="General Ledger"
        description="Account-by-account movements with running balances."
        actions={<PrintButton />}
      />

      <div className="space-y-4">
        {accounts.map((acc) => {
          const accLines = byAccount.get(acc.id) ?? [];
          let running = 0;
          const debitNormal = acc.normalBalance === "DEBIT";
          return (
            <Card key={acc.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{acc.accountCode} · {acc.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{acc.accountType}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {accLines.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No movements.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-muted-foreground text-xs">
                      <tr>
                        <th className="p-2 pl-4 text-left font-medium">Date</th>
                        <th className="p-2 text-left font-medium">Description</th>
                        <th className="p-2 text-right font-medium">Debit</th>
                        <th className="p-2 text-right font-medium">Credit</th>
                        <th className="p-2 pr-4 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {accLines.map((l) => {
                        const d = l.debit.toNumber(), c = l.credit.toNumber();
                        running += debitNormal ? d - c : c - d;
                        return (
                          <tr key={l.id}>
                            <td className="p-2 pl-4 whitespace-nowrap text-muted-foreground">{l.journalEntry.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                            <td className="p-2">{l.journalEntry.description}</td>
                            <td className="p-2 text-right tabular-nums">{d ? formatINR(d) : "—"}</td>
                            <td className="p-2 text-right tabular-nums">{c ? formatINR(c) : "—"}</td>
                            <td className="p-2 pr-4 text-right tabular-nums font-medium">{formatINR(running)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </WorkspaceLayout>
  );
}
