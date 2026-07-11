export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getCurrentPeriod } from "@/lib/finance/period";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { FinancialStatementTable, type FinancialRow } from "@/components/ui/financial-statement-table";
import { PrintButton } from "@/components/finance/print-button";

export default async function CashFlowPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const period = await getCurrentPeriod(businessId);
  const tx = await db.cashTransaction.findMany({ where: { businessId } });

  const signed = (kw: string) =>
    tx.filter((t) => (t.description ?? "").toLowerCase().includes(kw))
      .reduce((s, t) => s + (t.type === "CASH_IN" ? t.amount.toNumber() : -t.amount.toNumber()), 0);

  const collections = signed("collection");
  const supplierPay = signed("supplier");
  const opex = signed("operating");
  const opening = signed("opening");
  const operatingNet = collections + supplierPay + opex;
  const financingNet = opening;
  const netChange = tx.reduce((s, t) => s + (t.type === "CASH_IN" ? t.amount.toNumber() : -t.amount.toNumber()), 0);

  const rows: FinancialRow[] = [
    {
      id: "operating", label: "Operating Activities", isSubtotal: true, values: { actual: operatingNet },
      children: [
        { id: "coll", label: "Customer collections", values: { actual: collections } },
        { id: "sup", label: "Supplier payments", values: { actual: supplierPay } },
        { id: "opex", label: "Operating expenses", values: { actual: opex } },
      ],
    },
    {
      id: "financing", label: "Financing Activities", isSubtotal: true, values: { actual: financingNet },
      children: [{ id: "cap", label: "Opening capital / carried forward", values: { actual: opening } }],
    },
    { id: "net", label: "Net Change in Cash", isTotal: true, values: { actual: netChange } },
  ];

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Cash Flow Statement"
        description={`Cash movements for ${period.name} — from the treasury cash ledger.`}
        actions={<PrintButton />}
      />
      <div className="flex-1 overflow-auto mt-4 pb-12">
        <FinancialStatementTable data={rows} currencySymbol="₹" />
      </div>
    </WorkspaceLayout>
  );
}
