export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LineChart } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getInventory360 } from "@/lib/inventory/inventory-360";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/currency";
import { formatNumber } from "@/lib/utils";
import {
  EnterprisePage,
  EnterprisePageHeader,
  EnterpriseKPIRow,
  EnterpriseStatCard,
  EnterpriseSection,
  EnterpriseStatusBadge,
} from "@/components/enterprise";

const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default async function Inventory360Page({ params }: { params: Promise<{ variantId: string }> }) {
  const { variantId } = await params;
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");

  const data = await getInventory360(businessId, variantId);
  if (!data) notFound();

  const { variant, summary } = data;

  return (
    <EnterprisePage>
      <EnterprisePageHeader
        title={<span className="flex items-center gap-3">{variant.name}</span>}
        description={`${variant.product} · ${variant.sku} · ${variant.unit}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/inventory/stock-ledger?variant=${variantId}`} className={buttonVariants({ variant: "outline", size: "sm" })}><LineChart className="h-4 w-4" /> Stock Ledger</Link>
            <Link href="/inventory/stock-ledger" className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" /> All items</Link>
          </div>
        }
      />

      {/* Valuation snapshot + summary */}
      <EnterpriseKPIRow className="lg:grid-cols-6">
        <EnterpriseStatCard title="On Hand" value={formatNumber(summary.onHand)} />
        <EnterpriseStatCard title="Reserved" value={formatNumber(summary.reserved)} variant={summary.reserved > 0 ? "warning" : "default"} />
        <EnterpriseStatCard title="Available" value={formatNumber(summary.available)} />
        <EnterpriseStatCard title="Avg Cost" value={formatINR(summary.averageCost)} />
        <EnterpriseStatCard title="Inventory Value" value={formatINR(summary.value)} />
        <EnterpriseStatCard title="Warehouses" value={formatNumber(summary.warehouses)} />
      </EnterpriseKPIRow>

      {/* Warehouse balances + reservations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Warehouse balances</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1.5 font-medium">Warehouse</th>
                  <th className="py-1.5 text-right font-medium">On Hand</th>
                  <th className="py-1.5 text-right font-medium">Reserved</th>
                  <th className="py-1.5 text-right font-medium">Available</th>
                  <th className="py-1.5 text-right font-medium">Value</th>
                  <th className="py-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.warehouseBalances.map((w, i) => (
                  <tr key={i}>
                    <td className="py-1.5">{w.warehouse}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatNumber(w.onHand)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatNumber(w.reserved)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatNumber(w.available)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatINR(w.value)}</td>
                    <td className="py-1.5"><EnterpriseStatusBadge status={w.status} showIcon={false} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Reservations ({summary.activeReservations} active)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.reservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reservations.</p>
            ) : (
              data.reservations.slice(0, 12).map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.reference}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.warehouse} · {fmtDate(r.createdAt)}</div>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums text-muted-foreground">{formatNumber(r.quantity)}</span>
                    <EnterpriseStatusBadge status={r.status} showIcon={false} />
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movement history */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Movement history ({summary.movements})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {data.movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No movements.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1.5 font-medium">Date</th>
                  <th className="py-1.5 font-medium">Type</th>
                  <th className="py-1.5 font-medium">Warehouse</th>
                  <th className="py-1.5 font-medium">Reference</th>
                  <th className="py-1.5 text-right font-medium">In</th>
                  <th className="py-1.5 text-right font-medium">Out</th>
                  <th className="py-1.5 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.movements.map((l, i) => (
                  <tr key={i}>
                    <td className="py-1.5 whitespace-nowrap">{fmtDate(l.date)}</td>
                    <td className="py-1.5"><EnterpriseStatusBadge status={l.type} showIcon={false} /></td>
                    <td className="py-1.5">{l.warehouse}</td>
                    <td className="py-1.5 text-muted-foreground">{l.reference}</td>
                    <td className="py-1.5 text-right tabular-nums text-emerald-600">{l.quantityIn ? formatNumber(l.quantityIn) : "—"}</td>
                    <td className="py-1.5 text-right tabular-nums text-destructive">{l.quantityOut ? formatNumber(l.quantityOut) : "—"}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums">{formatNumber(l.runningBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <EnterpriseSection title="Timeline" description="Movements and reservation lifecycle, newest first">
        {data.timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="relative ml-3 space-y-4 border-l-2 border-muted pl-5">
            {data.timeline.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <EnterpriseStatusBadge status={e.kind === "Movement" ? "RECEIVED" : "ACTIVE"} showIcon={false} />
                  <span className="font-medium text-foreground">{e.label}</span>
                  <span className="text-muted-foreground">{e.detail}</span>
                  <span className="text-xs text-muted-foreground">{e.date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </EnterpriseSection>
    </EnterprisePage>
  );
}
