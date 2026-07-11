export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";

export default async function CashLedgerPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const transactions = await db.cashTransaction.findMany({
    where: { businessId },
    orderBy: { occurredAt: "desc" },
  });

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Cash Ledger" description="Treasury — cash in / cash out movements." />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Source</th>
                <th className="p-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 whitespace-nowrap">{tx.occurredAt.toLocaleString()}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        tx.type === "CASH_IN"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                      }`}
                    >
                      {tx.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4">{tx.description || "-"}</td>
                  <td className="p-4 text-muted-foreground">{tx.sourceType ? `${tx.sourceType}` : "-"}</td>
                  <td
                    className={`p-4 text-right font-medium ${
                      tx.type === "CASH_IN" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {tx.type === "CASH_IN" ? "+" : "-"}
                    {formatINR(tx.amount.toNumber(), { decimals: true })}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No cash transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}
