export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { FinancialReportingService } from "@/lib/finance/financial-reporting";
import { getCurrentPeriod } from "@/lib/finance/period";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/finance/print-button";

export default async function TrialBalancePage() {
  const { currentBusinessId: businessId, userId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const period = await getCurrentPeriod(businessId);
  const tb = await FinancialReportingService.getTrialBalance(businessId, userId, period.startDate, period.endDate);

  const split = (r: (typeof tb.rows)[number]) => {
    const isDebit = r.normalBalance === "DEBIT";
    const bal = r.closingBalance;
    return {
      debit: isDebit ? Math.max(bal, 0) : Math.max(-bal, 0),
      credit: isDebit ? Math.max(-bal, 0) : Math.max(bal, 0),
    };
  };

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Trial Balance"
        description={`All ledger accounts for ${period.name} — computed live from journal lines.`}
        actions={
          <div className="flex items-center gap-3">
            <Badge variant={tb.isValid ? "default" : "destructive"}>{tb.isValid ? "Balanced" : "Out of balance"}</Badge>
            <PrintButton />
          </div>
        }
      />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Code</th>
                <th className="p-3 font-medium">Account</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium text-right">Debit</th>
                <th className="p-3 font-medium text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tb.rows.map((r) => {
                const s = split(r);
                return (
                  <tr key={r.accountId} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{r.accountCode}</td>
                    <td className="p-3">{r.accountName}</td>
                    <td className="p-3 text-muted-foreground text-xs">{r.accountType}</td>
                    <td className="p-3 text-right tabular-nums">{s.debit ? formatINR(s.debit) : "—"}</td>
                    <td className="p-3 text-right tabular-nums">{s.credit ? formatINR(s.credit) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-border font-semibold">
              <tr>
                <td className="p-3" colSpan={3}>Total</td>
                <td className="p-3 text-right tabular-nums">{formatINR(tb.totalDebitNormal)}</td>
                <td className="p-3 text-right tabular-nums">{formatINR(tb.totalCreditNormal)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}
