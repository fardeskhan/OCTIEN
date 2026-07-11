export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { PrintButton } from "@/components/finance/print-button";

export default async function JournalsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const entries = await db.journalEntry.findMany({
    where: { businessId },
    include: { lines: { include: { account: true } } },
    orderBy: { date: "desc" },
    take: 100,
  });

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Journal Entries"
        description="Double-entry general journal — every posting affecting the ledger."
        actions={<PrintButton />}
      />

      <div className="space-y-3">
        {entries.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No journal entries found.</CardContent></Card>
        )}
        {entries.map((je) => {
          const debit = je.lines.reduce((s, l) => s + l.debit.toNumber(), 0);
          return (
            <Card key={je.id}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{je.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {je.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {je.sourceType.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{formatINR(debit)}</div>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {je.lines.map((l) => (
                      <tr key={l.id} className="text-muted-foreground">
                        <td className="py-2 pl-6 pr-3">{l.account.accountCode} · {l.account.name}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-foreground">{l.debit.toNumber() ? formatINR(l.debit.toNumber()) : ""}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-foreground">{l.credit.toNumber() ? formatINR(l.credit.toNumber()) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </WorkspaceLayout>
  );
}
