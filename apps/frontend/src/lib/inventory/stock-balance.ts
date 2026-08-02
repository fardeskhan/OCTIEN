/**
 * Stock Balance & Availability read models — the canonical "what do we have and where" view, derived
 * from `InventoryVariantProjection` (the verified source of truth: onHand/reserved/available/
 * averageCost) joined to variant + warehouse metadata. No recomputation of stock here; the
 * projection is maintained by the inventory action + outbox handlers and proven consistent by the
 * runtime harness (`available = onHand − reserved`, `Δprojection = Δledger`).
 */
import { db } from "@/lib/db";
import { resolveVariantMeta, resolveWarehouseMeta, stockStatus, round2, type StockStatus } from "./inventory-utils";

export interface StockBalanceRow {
  variantId: string;
  variant: string;
  sku: string;
  product: string;
  unit: string;
  warehouseId: string;
  warehouse: string;
  onHand: number;
  reserved: number;
  available: number;
  averageCost: number;
  value: number; // onHand × averageCost
  status: StockStatus;
}

export interface StockBalanceTotals {
  skuCount: number; // distinct variants with a projection
  lineCount: number; // variant×warehouse rows
  warehouseCount: number;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  totalValue: number;
  outOfStock: number;
  lowStock: number;
}

export interface StockBalance {
  rows: StockBalanceRow[];
  totals: StockBalanceTotals;
}

export async function getStockBalance(businessId: string): Promise<StockBalance> {
  const [projections, variantMeta, warehouseMeta] = await Promise.all([
    db.inventoryVariantProjection.findMany({ where: { businessId } }),
    resolveVariantMeta(businessId),
    resolveWarehouseMeta(businessId),
  ]);

  const rows: StockBalanceRow[] = projections.map((p) => {
    const vm = variantMeta.get(p.variantId);
    const wm = warehouseMeta.get(p.warehouseId);
    const onHand = p.onHandQuantity;
    const reserved = p.reservedQuantity;
    const available = p.availableQuantity;
    const averageCost = p.averageCost.toNumber();
    return {
      variantId: p.variantId,
      variant: vm?.variant ?? "—",
      sku: vm?.sku ?? "—",
      product: vm?.product ?? "—",
      unit: vm?.unit ?? "pcs",
      warehouseId: p.warehouseId,
      warehouse: wm?.name ?? "—",
      onHand,
      reserved,
      available,
      averageCost: round2(averageCost),
      value: round2(onHand * averageCost),
      status: stockStatus(onHand, available),
    };
  });

  rows.sort((a, b) => b.value - a.value);

  const distinctVariants = new Set(rows.map((r) => r.variantId));
  const distinctWarehouses = new Set(rows.map((r) => r.warehouseId));
  const totals: StockBalanceTotals = {
    skuCount: distinctVariants.size,
    lineCount: rows.length,
    warehouseCount: distinctWarehouses.size,
    totalOnHand: round2(rows.reduce((s, r) => s + r.onHand, 0)),
    totalReserved: round2(rows.reduce((s, r) => s + r.reserved, 0)),
    totalAvailable: round2(rows.reduce((s, r) => s + r.available, 0)),
    totalValue: round2(rows.reduce((s, r) => s + r.value, 0)),
    outOfStock: rows.filter((r) => r.status === "OUT_OF_STOCK").length,
    lowStock: rows.filter((r) => r.status === "LOW").length,
  };

  return { rows, totals };
}

export interface AvailabilityRow {
  variantId: string;
  variant: string;
  sku: string;
  product: string;
  unit: string;
  onHand: number;
  reserved: number;
  available: number;
  warehouses: number;
  status: StockStatus;
}

/** Per-variant availability aggregated across all warehouses (onHand − reserved). */
export async function getInventoryAvailability(businessId: string): Promise<AvailabilityRow[]> {
  const { rows } = await getStockBalance(businessId);
  const byVariant = new Map<string, AvailabilityRow>();
  for (const r of rows) {
    const cur = byVariant.get(r.variantId) ?? { variantId: r.variantId, variant: r.variant, sku: r.sku, product: r.product, unit: r.unit, onHand: 0, reserved: 0, available: 0, warehouses: 0, status: "OK" as StockStatus };
    cur.onHand += r.onHand;
    cur.reserved += r.reserved;
    cur.available += r.available;
    cur.warehouses += 1;
    byVariant.set(r.variantId, cur);
  }
  const out = [...byVariant.values()].map((v) => ({ ...v, onHand: round2(v.onHand), reserved: round2(v.reserved), available: round2(v.available), status: stockStatus(v.onHand, v.available) }));
  out.sort((a, b) => a.available - b.available);
  return out;
}
