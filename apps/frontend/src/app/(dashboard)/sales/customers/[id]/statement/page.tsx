export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getCustomerLedger } from "@/lib/finance/customer-ledger";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/currency";
import { EnterprisePage, EnterprisePageHeader, EnterprisePrintButton, EnterpriseEmptyState } from "@/components/enterprise";
import { StatementTable, type StatementRow } from "./statement-table";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function SummaryItem({ label, value, tone }: { label: string; value: string; tone?: "danger" | "muted" }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${tone === "danger" ? "text-destructive" : tone === "muted" ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

export default async function CustomerStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");

  const ledger = await getCustomerLedger(businessId, id);
  if (!ledger) notFound();

  const rows: StatementRow[] = ledger.transactions.map((t) => ({
    date: fmtDate(t.date),
    reference: t.reference,
    type: t.type,
    debit: Math.round(t.debit),
    credit: Math.round(t.credit),
    running: Math.round(t.runningBalance),
  }));

  return (
    <EnterprisePage>
      <EnterprisePageHeader
        title={`Statement — ${ledger.name}`}
        description={`Customer ${ledger.code} · account statement`}
        actions={
          <div className="flex items-center gap-2">
            <EnterprisePrintButton />
            <Link href={`/sales/customers/${id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="h-4 w-4" /> Customer
            </Link>
          </div>
        }
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-3 lg:grid-cols-4">
          <SummaryItem label="Outstanding Balance" value={formatINR(ledger.outstandingBalance)} tone={ledger.outstandingBalance > 0 ? "danger" : undefined} />
          <SummaryItem label="Overdue Amount" value={formatINR(ledger.overdueAmount)} tone={ledger.overdueAmount > 0 ? "danger" : undefined} />
          <SummaryItem label="Credit Limit" value={ledger.creditLimit != null ? formatINR(ledger.creditLimit) : "Not set"} tone={ledger.creditLimit == null ? "muted" : undefined} />
          <SummaryItem label="Available Credit" value={ledger.availableCredit != null ? formatINR(ledger.availableCredit) : "Not set"} tone={ledger.availableCredit == null ? "muted" : undefined} />
          <SummaryItem label="Total Invoiced" value={formatINR(ledger.totalInvoiced)} />
          <SummaryItem label="Total Received" value={formatINR(ledger.totalPaid)} />
          <SummaryItem
            label="Last Invoice"
            value={ledger.lastInvoice ? `${formatINR(ledger.lastInvoice.amount)} · ${fmtDate(ledger.lastInvoice.date)}` : "—"}
          />
          <SummaryItem
            label="Last Payment"
            value={ledger.lastPayment ? `${formatINR(ledger.lastPayment.amount)} · ${fmtDate(ledger.lastPayment.date)}` : "—"}
          />
          <SummaryItem
            label="Avg Collection Days"
            value={ledger.averageCollectionDays != null ? `${ledger.averageCollectionDays} days` : "—"}
          />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EnterpriseEmptyState title="No transactions" description="This customer has no invoices or payments yet." />
      ) : (
        <div className="flex-1 overflow-hidden">
          <StatementTable data={rows} />
        </div>
      )}
    </EnterprisePage>
  );
}
