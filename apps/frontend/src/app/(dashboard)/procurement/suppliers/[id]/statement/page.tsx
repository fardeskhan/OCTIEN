export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getVendorLedger } from "@/lib/finance/vendor-ledger";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/currency";
import {
  EnterprisePage,
  EnterprisePageHeader,
  EnterprisePrintButton,
  EnterpriseEmptyState,
  EnterpriseReportTable,
  type ReportColumn,
  type ReportRow,
} from "@/components/enterprise";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const COLUMNS: ReportColumn[] = [
  { key: "date", header: "Date" },
  { key: "reference", header: "Reference" },
  { key: "type", header: "Type", format: "status" },
  { key: "debit", header: "Debit", format: "money" },
  { key: "credit", header: "Credit", format: "money" },
  { key: "running", header: "Running Balance", format: "money" },
];

function SummaryItem({ label, value, tone }: { label: string; value: string; tone?: "danger" | "muted" }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${tone === "danger" ? "text-destructive" : tone === "muted" ? "text-muted-foreground" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

export default async function VendorStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");

  const ledger = await getVendorLedger(businessId, id);
  if (!ledger) notFound();

  const rows: ReportRow[] = ledger.transactions.map((t) => ({
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
        title={`Vendor Statement — ${ledger.name}`}
        description={`Supplier ${ledger.code} · accounts payable statement`}
        actions={
          <div className="flex items-center gap-2">
            <EnterprisePrintButton />
            <Link href="/procurement/suppliers" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="h-4 w-4" /> Suppliers
            </Link>
          </div>
        }
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-3 lg:grid-cols-4">
          <SummaryItem label="Outstanding AP" value={formatINR(ledger.outstandingBalance)} tone={ledger.outstandingBalance > 0 ? "danger" : undefined} />
          <SummaryItem label="Overdue" value={formatINR(ledger.overdueAmount)} tone={ledger.overdueAmount > 0 ? "danger" : undefined} />
          <SummaryItem label="Credit Limit" value={ledger.creditLimit != null ? formatINR(ledger.creditLimit) : "Not set"} tone={ledger.creditLimit == null ? "muted" : undefined} />
          <SummaryItem label="Available Credit" value={ledger.availableCredit != null ? formatINR(ledger.availableCredit) : "Not set"} tone={ledger.availableCredit == null ? "muted" : undefined} />
          <SummaryItem label="Total Purchased" value={formatINR(ledger.totalPurchased)} />
          <SummaryItem label="Total Paid" value={formatINR(ledger.totalPaid)} />
          <SummaryItem label="Last Bill" value={ledger.lastBill ? `${formatINR(ledger.lastBill.amount)} · ${fmtDate(ledger.lastBill.date)}` : "—"} />
          <SummaryItem label="Last Payment" value={ledger.lastPayment ? `${formatINR(ledger.lastPayment.amount)} · ${fmtDate(ledger.lastPayment.date)}` : "—"} />
          <SummaryItem label="Avg Payment Days" value={ledger.averagePaymentDays != null ? `${ledger.averagePaymentDays} days` : "—"} />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EnterpriseEmptyState title="No transactions" description="This supplier has no bills or payments yet." />
      ) : (
        <div className="flex-1 overflow-hidden">
          <EnterpriseReportTable columns={COLUMNS} data={rows} searchPlaceholder="Search transactions…" statusKey="type" />
        </div>
      )}
    </EnterprisePage>
  );
}
