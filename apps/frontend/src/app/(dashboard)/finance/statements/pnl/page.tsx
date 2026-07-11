export const dynamic = "force-dynamic";

import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { FinancialReportingService } from "@/lib/finance/financial-reporting";
import { getCurrentPeriod } from "@/lib/finance/period";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { FinancialStatementTable, type FinancialRow } from "@/components/ui/financial-statement-table";
import { PrintButton } from "@/components/finance/print-button";

export default async function PnLPage() {
  const { currentBusinessId: businessId, userId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const period = await getCurrentPeriod(businessId);
  const pl = await FinancialReportingService.getProfitAndLoss(businessId, userId, period.startDate, period.endDate);

  const revNet = (a: { periodDebits: number; periodCredits: number }) => a.periodCredits - a.periodDebits;
  const expNet = (a: { periodDebits: number; periodCredits: number }) => a.periodDebits - a.periodCredits;

  const rows: FinancialRow[] = [
    {
      id: "revenue", label: "Revenue", isSubtotal: true, values: { actual: pl.revenue.total },
      children: pl.revenue.accounts.map((a) => ({ id: a.accountId, label: `${a.accountCode} · ${a.accountName}`, values: { actual: revNet(a) } })),
    },
    {
      id: "expenses", label: "Operating Expenses", isSubtotal: true, values: { actual: pl.expenses.total },
      children: pl.expenses.accounts.map((a) => ({ id: a.accountId, label: `${a.accountCode} · ${a.accountName}`, values: { actual: expNet(a) } })),
    },
    { id: "net", label: "Net Profit", isTotal: true, values: { actual: pl.netProfit } },
  ];

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Profit &amp; Loss Statement"
        description={`Income statement for ${period.name} — computed live from the general ledger.`}
        actions={<PrintButton />}
      />
      <div className="flex-1 overflow-auto mt-4 pb-12">
        <FinancialStatementTable data={rows} currencySymbol="₹" />
      </div>
    </WorkspaceLayout>
  );
}
