export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getVendor360 } from "@/lib/procurement/vendor-360";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/currency";
import {
  EnterprisePage,
  EnterprisePageHeader,
  EnterpriseKPIRow,
  EnterpriseStatCard,
  EnterpriseSection,
  EnterpriseStatusBadge,
} from "@/components/enterprise";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function ChipList({ title, rows }: { title: string; rows: { code: string; status: string; extra?: string }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-medium">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">None.</p>
        ) : (
          rows.map((r) => (
            <div key={r.code} className="flex items-center justify-between text-sm">
              <span className="font-medium">{r.code}</span>
              <span className="flex items-center gap-2">
                {r.extra && <span className="tabular-nums text-muted-foreground">{r.extra}</span>}
                <EnterpriseStatusBadge status={r.status} showIcon={false} />
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default async function Vendor360Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");

  const data = await getVendor360(businessId, id);
  if (!data) notFound();

  const { supplier, summary, activity, aging } = data;

  return (
    <EnterprisePage>
      <EnterprisePageHeader
        title={
          <span className="flex items-center gap-3">
            {supplier.name}
            <EnterpriseStatusBadge status={supplier.status} showIcon={false} />
          </span>
        }
        description={`Supplier ${supplier.code} · since ${fmtDate(supplier.since)}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/procurement/suppliers/${id}/statement`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <FileText className="h-4 w-4" /> Statement
            </Link>
            <Link href="/procurement/suppliers" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="h-4 w-4" /> Suppliers
            </Link>
          </div>
        }
      />

      {/* Summary */}
      <EnterpriseKPIRow className="lg:grid-cols-6">
        <EnterpriseStatCard title="Outstanding AP" value={formatINR(summary.outstanding)} variant={summary.outstanding > 0 ? "warning" : "default"} />
        <EnterpriseStatCard title="Overdue" value={formatINR(summary.overdue)} variant={summary.overdue > 0 ? "destructive" : "default"} />
        <EnterpriseStatCard title="Credit Limit" value={summary.creditLimit != null ? formatINR(summary.creditLimit) : "Not set"} />
        <EnterpriseStatCard title="Available Credit" value={summary.availableCredit != null ? formatINR(summary.availableCredit) : "Not set"} />
        <EnterpriseStatCard title="Avg Payment Days" value={summary.averagePaymentDays != null ? `${summary.averagePaymentDays}d` : "—"} />
        <EnterpriseStatCard title="Total Purchased" value={formatINR(summary.totalPurchased)} />
      </EnterpriseKPIRow>

      {/* Procurement activity */}
      <EnterpriseKPIRow className="lg:grid-cols-4">
        <EnterpriseStatCard title="Purchase Orders" value={activity.purchaseOrders} />
        <EnterpriseStatCard title="Goods Receipts" value={activity.goodsReceipts} />
        <EnterpriseStatCard title="Vendor Bills" value={activity.bills} />
        <EnterpriseStatCard title="Payments" value={activity.payments} />
      </EnterpriseKPIRow>

      {/* Financial */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Vendor ledger snapshot</CardTitle></CardHeader>
          <CardContent>
            {data.ledgerRecent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-1.5 font-medium">Date</th>
                      <th className="py-1.5 font-medium">Reference</th>
                      <th className="py-1.5 font-medium">Type</th>
                      <th className="py-1.5 text-right font-medium">Debit</th>
                      <th className="py-1.5 text-right font-medium">Credit</th>
                      <th className="py-1.5 text-right font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.ledgerRecent.map((t, i) => (
                      <tr key={i}>
                        <td className="py-1.5">{fmtDate(t.date)}</td>
                        <td className="py-1.5">{t.reference}</td>
                        <td className="py-1.5">{t.type}</td>
                        <td className="py-1.5 text-right tabular-nums">{t.debit ? formatINR(t.debit) : "—"}</td>
                        <td className="py-1.5 text-right tabular-nums text-success">{t.credit ? formatINR(t.credit) : "—"}</td>
                        <td className="py-1.5 text-right font-medium tabular-nums">{formatINR(t.runningBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">AP aging snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {aging ? (
              [
                ["Current", aging.current],
                ["1–30", aging.d1_30],
                ["31–60", aging.d31_60],
                ["61–90", aging.d61_90],
                ["91–120", aging.d91_120],
                ["120+", aging.d120plus],
              ].map(([label, val]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums">{Number(val) ? formatINR(Number(val)) : "—"}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No outstanding balance.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operations + products */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ChipList title="Open purchase orders" rows={data.openPurchaseOrders.map((o) => ({ code: o.code, status: o.status, extra: formatINR(o.total) }))} />
        <ChipList title="Pending receipts" rows={data.pendingReceipts} />
        <ChipList title="Bills awaiting approval" rows={data.billsAwaitingApproval} />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Top purchased items</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              data.topProducts.map((p) => (
                <div key={p.product} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2 font-medium">{p.product}</span>
                  <span className="tabular-nums text-muted-foreground">{formatINR(p.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <EnterpriseSection title="Timeline" description="Every event for this supplier, newest first">
        {data.timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="relative ml-3 space-y-4 border-l-2 border-muted pl-5">
            {data.timeline.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <EnterpriseStatusBadge status={e.type} showIcon={false} />
                  <span className="text-foreground">{e.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </EnterpriseSection>
    </EnterprisePage>
  );
}
