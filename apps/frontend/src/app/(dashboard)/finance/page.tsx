export const dynamic = "force-dynamic";

import Link from "next/link";
import { db, withActiveRecords } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Banknote,
  Building2,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  Lock,
} from "lucide-react";

const SECTIONS = [
  { title: "Accounting", href: "/finance/accounting/ledger", icon: BookOpen, desc: "Journals, ledger, trial balance" },
  { title: "Treasury", href: "/finance/treasury/cash", icon: Banknote, desc: "Cash, accounts, forecast, reconciliation" },
  { title: "Assets", href: "/finance/assets/register", icon: Building2, desc: "Fixed asset register & depreciation" },
  { title: "Receivables", href: "/finance/receivables", icon: ArrowDownCircle, desc: "Customer invoices & collections" },
  { title: "Payables", href: "/finance/payables", icon: ArrowUpCircle, desc: "Supplier bills & payment runs" },
  { title: "Statements", href: "/finance/statements/pnl", icon: FileText, desc: "P&L, balance sheet, cash flow" },
  { title: "Period Close", href: "/finance/close/checklist", icon: Lock, desc: "Month-end close & history" },
];

export default async function FinanceOverviewPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const [invoices, bills, cashTx] = await Promise.all([
    db.customerInvoice.findMany(withActiveRecords({ where: { businessId } })),
    db.supplierBill.findMany(withActiveRecords({ where: { businessId } })),
    db.cashTransaction.findMany({ where: { businessId } }),
  ]);

  const totalAR = invoices.reduce((s, i) => s + i.remainingAmount.toNumber(), 0);
  const totalAP = bills.reduce((s, b) => s + b.remainingAmount.toNumber(), 0);
  const cashIn = cashTx.filter((t) => t.type === "CASH_IN").reduce((s, t) => s + t.amount.toNumber(), 0);
  const cashOut = cashTx.filter((t) => t.type === "CASH_OUT").reduce((s, t) => s + t.amount.toNumber(), 0);
  const netCash = cashIn - cashOut;

  const outstandingInvoices = invoices.filter((i) => i.remainingAmount.toNumber() > 0).slice(0, 5);
  const outstandingBills = bills.filter((b) => b.remainingAmount.toNumber() > 0).slice(0, 5);

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Finance" description="Financial position, receivables, payables, and cash." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/finance/receivables">
          <KPICard title="Accounts Receivable" value={formatINR(totalAR)} freshness="Live" className="hover:shadow-md transition-shadow" />
        </Link>
        <Link href="/finance/payables">
          <KPICard title="Accounts Payable" value={formatINR(totalAP)} freshness="Live" className="hover:shadow-md transition-shadow" />
        </Link>
        <Link href="/finance/treasury/ledger">
          <KPICard title="Net Cash" value={formatINR(netCash)} variant={netCash >= 0 ? "success" : "destructive"} freshness="Live" className="hover:shadow-md transition-shadow" />
        </Link>
        <KPICard title="Cash Out (period)" value={formatINR(cashOut)} freshness="Live" />
      </div>

      {/* Section navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {SECTIONS.map((s) => (
          <Link key={s.title} href={s.href}>
            <Card className="h-full hover:shadow-md hover:border-primary/40 transition-all">
              <CardContent className="p-4 flex flex-col gap-2">
                <s.icon className="h-5 w-5 text-muted-foreground" />
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Outstanding Invoices (AR)
            </h2>
            {outstandingInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No outstanding invoices.</p>
            ) : (
              outstandingInvoices.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{inv.code}</div>
                    <div className="text-xs text-muted-foreground">{inv.status.replace("_", " ")}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatINR(inv.remainingAmount.toNumber())}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Outstanding Bills (AP)
            </h2>
            {outstandingBills.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No outstanding bills.</p>
            ) : (
              outstandingBills.map((bill) => (
                <div key={bill.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{bill.code}</div>
                    <div className="text-xs text-muted-foreground">{bill.status}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatINR(bill.remainingAmount.toNumber())}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </WorkspaceLayout>
  );
}
