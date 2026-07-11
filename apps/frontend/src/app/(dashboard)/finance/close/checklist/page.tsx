export const dynamic = "force-dynamic";

import { CheckCircle2, XCircle, Circle } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { FinancialReportingService } from "@/lib/finance/financial-reporting";
import { getCurrentPeriod } from "@/lib/finance/period";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function CloseChecklistPage() {
  const { currentBusinessId: businessId, userId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const period = await getCurrentPeriod(businessId);
  const [tb, journalCount, invoices, receivables, bills, payables, accounts, cashTx] = await Promise.all([
    FinancialReportingService.getTrialBalance(businessId, userId, period.startDate, period.endDate),
    db.journalEntry.count({ where: { businessId } }),
    db.customerInvoice.findMany({ where: { businessId, deletedAt: null }, select: { remainingAmount: true } }),
    db.receivableEntry.findMany({ where: { businessId }, select: { amount: true, paidAmount: true } }),
    db.supplierBill.findMany({ where: { businessId, deletedAt: null }, select: { remainingAmount: true } }),
    db.payableEntry.findMany({ where: { businessId }, select: { amount: true, paidAmount: true } }),
    db.bankAccount.findMany({ where: { businessId }, select: { openingBalance: true } }),
    db.cashTransaction.findMany({ where: { businessId }, select: { type: true, amount: true } }),
  ]);

  const arInvoices = invoices.reduce((s, i) => s + i.remainingAmount.toNumber(), 0);
  const arEntries = receivables.reduce((s, r) => s + (r.amount.toNumber() - r.paidAmount.toNumber()), 0);
  const apBills = bills.reduce((s, b) => s + b.remainingAmount.toNumber(), 0);
  const apEntries = payables.reduce((s, p) => s + (p.amount.toNumber() - p.paidAmount.toNumber()), 0);
  const bankCash = accounts.reduce((s, a) => s + a.openingBalance.toNumber(), 0);
  const ledgerCash = cashTx.reduce((s, t) => s + (t.type === "CASH_IN" ? t.amount.toNumber() : -t.amount.toNumber()), 0);

  const checks = [
    { label: "Accounting period is open", ok: period.status === "OPEN" },
    { label: "Journal entries posted", ok: journalCount > 0, detail: `${journalCount} entries` },
    { label: "Trial balance is balanced", ok: tb.isValid },
    { label: "Receivables ledger reconciles to invoices", ok: Math.abs(arInvoices - arEntries) < 1 },
    { label: "Payables ledger reconciles to bills", ok: Math.abs(apBills - apEntries) < 1 },
    { label: "Cash ledger reconciles to bank position", ok: Math.abs(bankCash - ledgerCash) < 1 },
  ];
  const done = checks.filter((c) => c.ok).length;
  const pct = Math.round((done / checks.length) * 100);

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Period Close Checklist" description={`Month-end readiness for ${period.name} — checks computed live from the ledger.`} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Checks Passed" value={`${done}/${checks.length}`} freshness="Live" />
        <KPICard title="Readiness" value={`${pct}%`} variant={pct === 100 ? "success" : "warning"} freshness="Live" />
        <KPICard title="Period" value={period.name} freshness="Live" />
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {c.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}
                <span className="text-sm">{c.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{c.detail ?? (c.ok ? "Reconciled" : "Needs attention")}</span>
            </div>
          ))}
          {checks.length === 0 && <div className="flex items-center gap-2 p-4 text-muted-foreground"><Circle className="h-4 w-4" /> No checks.</div>}
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}
