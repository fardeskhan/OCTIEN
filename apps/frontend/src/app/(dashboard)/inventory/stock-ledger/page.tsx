export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, LineChart } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getStockBalance } from "@/lib/inventory/stock-balance";
import { getStockLedger } from "@/lib/inventory/stock-ledger";
import { formatNumber } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  EnterprisePage,
  EnterprisePageHeader,
  EnterpriseKPIRow,
  EnterpriseReportLayout,
  EnterpriseReportTable,
  EnterpriseStatusBadge,
  type ReportColumn,
} from "@/components/enterprise";

const LEDGER_COLUMNS: ReportColumn[] = [
  { key: "date", header: "Date" },
  { key: "type", header: "Type", format: "status" },
  { key: "warehouse", header: "Warehouse" },
  { key: "reference", header: "Reference" },
  { key: "inQty", header: "In", format: "number" },
  { key: "outQty", header: "Out", format: "number" },
  { key: "balance", header: "Running Balance", format: "number" },
];

const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default async function StockLedgerPage({ searchParams }: { searchParams: Promise<{ variant?: string; warehouse?: string }> }) {
  const { variant: variantId, warehouse: warehouseId } = await searchParams;
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("inventory.read");

  const balance = await getStockBalance(businessId);

  // ── Variant picker (no variant selected) ─────────────────────────────────────────────────────
  if (!variantId) {
    // Aggregate to one row per variant for the picker.
    const byVariant = new Map<string, { variant: string; product: string; sku: string; onHand: number; available: number; warehouses: number }>();
    for (const r of balance.rows) {
      const cur = byVariant.get(r.variantId) ?? { variant: r.variant, product: r.product, sku: r.sku, onHand: 0, available: 0, warehouses: 0 };
      cur.onHand += r.onHand;
      cur.available += r.available;
      cur.warehouses += 1;
      byVariant.set(r.variantId, cur);
    }
    const rows = [...byVariant.entries()].sort((a, b) => b[1].onHand - a[1].onHand);

    return (
      <EnterprisePage>
        <EnterprisePageHeader title="Stock Ledger" description="Select a variant to view its running stock balance." />
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Product</th>
                  <th className="p-3 font-medium">Variant</th>
                  <th className="p-3 font-medium">SKU</th>
                  <th className="p-3 text-right font-medium">On Hand</th>
                  <th className="p-3 text-right font-medium">Available</th>
                  <th className="p-3 text-right font-medium">Warehouses</th>
                  <th className="p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No stock on hand.</td></tr>
                ) : (
                  rows.map(([id, v]) => (
                    <tr key={id} className="transition-colors hover:bg-muted/30">
                      <td className="p-3">{v.product}</td>
                      <td className="p-3 font-medium">
                        <Link href={`/inventory/stock-ledger?variant=${id}`} className="text-primary hover:underline">{v.variant}</Link>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{v.sku}</td>
                      <td className="p-3 text-right tabular-nums">{formatNumber(v.onHand)}</td>
                      <td className="p-3 text-right tabular-nums">{formatNumber(v.available)}</td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">{v.warehouses}</td>
                      <td className="p-3 text-right">
                        <Link href={`/inventory/360/${id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>360</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </EnterprisePage>
    );
  }

  // ── Ledger for the selected variant (optionally scoped to a warehouse) ────────────────────────
  const ledger = await getStockLedger(businessId, variantId, warehouseId);
  if (!ledger) {
    return (
      <EnterprisePage>
        <EnterprisePageHeader title="Stock Ledger" description="Variant not found." />
        <Link href="/inventory/stock-ledger" className={buttonVariants({ variant: "outline", size: "sm" })}><ArrowLeft className="h-4 w-4" /> All variants</Link>
      </EnterprisePage>
    );
  }

  // Warehouses this variant is stocked in → filter chips.
  const variantWarehouses = balance.rows.filter((r) => r.variantId === variantId).map((r) => ({ id: r.warehouseId, name: r.warehouse }));

  const tableRows = ledger.lines.map((l) => ({
    date: fmtDate(l.date),
    type: l.type,
    warehouse: l.warehouse,
    reference: l.reference,
    inQty: l.quantityIn,
    outQty: l.quantityOut,
    balance: l.runningBalance,
  }));

  return (
    <EnterpriseReportLayout
      title={`Stock Ledger — ${ledger.variant}`}
      description={`${ledger.product} · ${ledger.sku} · ${ledger.unit}${ledger.warehouse ? ` · ${ledger.warehouse}` : " · all warehouses"}`}
      kpis={[
        { label: "Total In", value: formatNumber(ledger.totalIn) },
        { label: "Total Out", value: formatNumber(ledger.totalOut) },
        { label: "Closing (ledger)", value: formatNumber(ledger.closingBalance) },
        { label: "Movements", value: String(ledger.movementCount) },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Link href={`/inventory/360/${variantId}`} className={buttonVariants({ variant: "outline", size: "sm" })}><LineChart className="h-4 w-4" /> 360</Link>
          <Link href="/inventory/stock-ledger" className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" /> All variants</Link>
        </div>
      }
    >
      {/* Warehouse filter */}
      <EnterpriseKPIRow className="lg:grid-cols-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Warehouse:</span>
          <Link href={`/inventory/stock-ledger?variant=${variantId}`} className={!warehouseId ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}>All</Link>
          {variantWarehouses.map((w) => (
            <Link key={w.id} href={`/inventory/stock-ledger?variant=${variantId}&warehouse=${w.id}`} className={warehouseId === w.id ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}>
              {w.name}
            </Link>
          ))}
        </div>
      </EnterpriseKPIRow>

      {tableRows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No movements for this selection.</CardContent></Card>
      ) : (
        <EnterpriseReportTable columns={LEDGER_COLUMNS} data={tableRows} searchPlaceholder="Search movements…" statusKey="type" />
      )}

      <p className="text-xs text-muted-foreground">
        Note: the ledger closing balance is the sum of recorded movements. For stock seeded without an opening-balance movement,
        this can differ from the projection on-hand; see the item&apos;s 360 for the projection view.{" "}
        <EnterpriseStatusBadge status="INFO" showIcon={false} />
      </p>
    </EnterpriseReportLayout>
  );
}
