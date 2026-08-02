/**
 * Inventory shared utilities — batch metadata resolvers + small helpers reused by the inventory
 * read-model services (stock-balance, stock-ledger, inventory-valuation, dashboard, reports, 360).
 * Mirrors the composition style of `lib/procurement/*`: services stay thin and never re-query
 * metadata individually.
 *
 * NOTE (model limitation): there is NO reorder-point / min-stock / safety-stock field on
 * ProductVariant or InventoryRecord. "Low stock" is therefore a documented heuristic, not a
 * per-variant reorder policy. When reorder points are modelled, `stockStatus` is the single place to
 * change.
 */
import { db } from "@/lib/db";

/** Available at/below this is flagged LOW (heuristic — no reorder-point model exists yet). */
export const LOW_STOCK_THRESHOLD = 10;

export type StockStatus = "OUT_OF_STOCK" | "LOW" | "OK";

export function stockStatus(onHand: number, available: number): StockStatus {
  if (onHand <= 0) return "OUT_OF_STOCK";
  if (available <= LOW_STOCK_THRESHOLD) return "LOW";
  return "OK";
}

export interface VariantMeta {
  variantId: string;
  variant: string;
  sku: string;
  product: string;
  unit: string;
  cost: number; // standard cost on the variant (distinct from moving averageCost on the projection)
  price: number;
}

/** Batch-resolve variant metadata (variant/product/unit names) for a business into a lookup map. */
export async function resolveVariantMeta(businessId: string): Promise<Map<string, VariantMeta>> {
  const variants = await db.productVariant.findMany({
    where: { businessId, deletedAt: null },
    select: { id: true, name: true, sku: true, cost: true, price: true, product: { select: { name: true } }, unit: { select: { symbol: true } } },
  });
  return new Map(
    variants.map((v) => [
      v.id,
      { variantId: v.id, variant: v.name, sku: v.sku ?? "—", product: v.product?.name ?? "—", unit: v.unit?.symbol ?? "pcs", cost: v.cost ?? 0, price: v.price ?? 0 },
    ]),
  );
}

export interface WarehouseMeta {
  warehouseId: string;
  code: string;
  name: string;
}

/** Batch-resolve warehouse metadata for a business into a lookup map. */
export async function resolveWarehouseMeta(businessId: string): Promise<Map<string, WarehouseMeta>> {
  const whs = await db.warehouse.findMany({ where: { businessId, deletedAt: null }, select: { id: true, code: true, name: true } });
  return new Map(whs.map((w) => [w.id, { warehouseId: w.id, code: w.code, name: w.name }]));
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const roundQty = (n: number) => Math.round(n * 1000) / 1000;
