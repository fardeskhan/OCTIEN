export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { FinancialReportingService } from "@/lib/finance/financial-reporting";
import { getCurrentPeriod } from "@/lib/finance/period";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { FinancialStatementTable, type FinancialRow } from "@/components/ui/financial-statement-table";
import { PrintButton } from "@/components/finance/print-button";

export default async function BalanceSheetPage() {
  const { currentBusinessId: businessId, userId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const period = await getCurrentPeriod(businessId);
  const bs = await FinancialReportingService.getBalanceSheet(businessId, userId, period.startDate, period.endDate);

  const acctRows = (accounts: { accountId: string; accountCode: string; accountName: string; closingBalance: number }[]) =>
    accounts.map((a) => ({ id: a.accountId, label: `${a.accountCode} · ${a.accountName}`, values: { actual: a.closingBalance } }));

  const rows: FinancialRow[] = [
    { id: "assets", label: "Assets", isSubtotal: true, values: { actual: bs.totalAssets }, children: acctRows(bs.assets.accounts) },
    {
      id: "liabilities", label: "Liabilities", isSubtotal: true, values: { actual: bs.liabilities.total },
      children: acctRows(bs.liabilities.accounts),
    },
    {
      id: "equity", label: "Equity", isSubtotal: true, values: { actual: bs.equity.total },
      children: [
        ...acctRows(bs.equity.accounts),
        { id: "retained", label: "Current Period Profit", values: { actual: bs.equity.currentPeriodProfit } },
      ],
    },
    { id: "total", label: "Total Liabilities & Equity", isTotal: true, values: { actual: bs.totalLiabilitiesAndEquity } },
  ];

  const balanced = Math.abs(bs.totalAssets - bs.totalLiabilitiesAndEquity) < 1;

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Balance Sheet"
        description={`Financial position as at ${period.name} — ${balanced ? "assets = liabilities + equity ✓" : "review balancing"}.`}
        actions={<PrintButton />}
      />
      <div className="flex-1 overflow-auto mt-4 pb-12">
        <FinancialStatementTable data={rows} currencySymbol="₹" />
      </div>
    </WorkspaceLayout>
  );
}
