/**
 * Inventory report data — flat list/aggregate rows for `EnterpriseReportTable` (mirror of
 * `lib/procurement/procurement-reports.ts`). No financial/stock values are recomputed that a read
 * model already owns: balance/valuation come from the read-model services; the movement register and
 * slow-moving report are thin queries over `StockMovementRecord`.
 */
import { db } from "@/lib/db";
import { getStockBalance } from "./stock-balance";
import { getInventoryValuation } from "./inventory-valuation";
import { resolveVariantMeta, resolveWarehouseMeta } from "./inventory-utils";

const fmtDate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

/** Warehouse Stock Report — current on-hand/reserved/available/value per variant×warehouse. */
export async function getWarehouseStockReport(businessId: string) {
  const { rows } = await getStockBalance(businessId);
  return rows.map((r) => ({
    warehouse: r.warehouse,
    product: r.product,
    variant: r.variant,
    sku: r.sku,
    onHand: r.onHand,
    reserved: r.reserved,
    available: r.available,
    avgCost: r.averageCost,
    value: r.value,
    status: r.status,
  }));
}

/** Inventory Valuation report — value per variant (Σ across warehouses). */
export async function getInventoryValuationReport(businessId: string) {
  const val = await getInventoryValuation(businessId);
  return val.byVariant.map((v) => ({
    product: v.product,
    variant: v.variant,
    sku: v.sku,
    onHand: v.onHand,
    avgCost: v.averageCost,
    value: v.value,
  }));
}

/** Stock Movement Register — flat chronological movement list (newest first). */
export async function getStockMovementRegister(businessId: string, opts?: { limit?: number }) {
  const [movements, variantMeta, warehouseMeta] = await Promise.all([
    db.stockMovementRecord.findMany({ where: { businessId }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: opts?.limit ?? 500 }),
    resolveVariantMeta(businessId),
    resolveWarehouseMeta(businessId),
  ]);
  return movements.map((m) => {
    const vm = variantMeta.get(m.variantId);
    return {
      date: fmtDate(m.occurredAt),
      type: m.type,
      product: vm?.product ?? "—",
      variant: vm?.variant ?? "—",
      warehouse: warehouseMeta.get(m.warehouseId)?.name ?? "—",
      quantity: m.quantityValue,
      unit: m.quantityUnit,
      reference: m.correlationId ?? "—",
      actor: m.actorId,
    };
  });
}

/**
 * Slow-moving / aging inventory — ranked by days since last movement (proxy; there is no
 * batch-expiry-based aging universally). Only variants that currently hold stock are included.
 */
export async function getSlowMovingReport(businessId: string) {
  const [balance, lastMovements, variantMeta] = await Promise.all([
    getStockBalance(businessId),
    db.stockMovementRecord.groupBy({ by: ["variantId"], where: { businessId }, _max: { occurredAt: true } }),
    resolveVariantMeta(businessId),
  ]);
  const lastByVariant = new Map(lastMovements.map((g) => [g.variantId, g._max.occurredAt]));

  // Aggregate on-hand + value per variant from the balance rows.
  const byVariant = new Map<string, { onHand: number; value: number }>();
  for (const r of balance.rows) {
    const cur = byVariant.get(r.variantId) ?? { onHand: 0, value: 0 };
    cur.onHand += r.onHand;
    cur.value += r.value;
    byVariant.set(r.variantId, cur);
  }

  const now = Date.now();
  const rows = [...byVariant.entries()]
    .filter(([, agg]) => agg.onHand > 0)
    .map(([variantId, agg]) => {
      const vm = variantMeta.get(variantId);
      const last = lastByVariant.get(variantId) ?? null;
      const daysSince = last ? Math.floor((now - last.getTime()) / 86400000) : null;
      return {
        product: vm?.product ?? "—",
        variant: vm?.variant ?? "—",
        sku: vm?.sku ?? "—",
        onHand: Math.round(agg.onHand),
        value: Math.round(agg.value),
        lastMovement: fmtDate(last),
        daysSinceLastMovement: daysSince ?? 9999,
      };
    });
  rows.sort((a, b) => b.daysSinceLastMovement - a.daysSinceLastMovement);
  return rows;
}

/** Fast-moving inventory — ranked by outbound volume over the last 30 days (velocity). */
export async function getFastMovingReport(businessId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const [outMovements, variantMeta] = await Promise.all([
    db.stockMovementRecord.groupBy({ by: ["variantId"], where: { businessId, quantityValue: { lt: 0 }, occurredAt: { gte: thirtyDaysAgo } }, _sum: { quantityValue: true }, _count: true }),
    resolveVariantMeta(businessId),
  ]);
  return outMovements
    .map((g) => {
      const vm = variantMeta.get(g.variantId);
      return { product: vm?.product ?? "—", variant: vm?.variant ?? "—", sku: vm?.sku ?? "—", outboundUnits: Math.abs(g._sum.quantityValue ?? 0), movements: g._count };
    })
    .filter((r) => r.outboundUnits > 0)
    .sort((a, b) => b.outboundUnits - a.outboundUnits);
}

/** Reserved Stock report — variant×warehouse lines currently holding an active reservation. */
export async function getReservedStockReport(businessId: string) {
  const { rows } = await getStockBalance(businessId);
  return rows
    .filter((r) => r.reserved > 0)
    .map((r) => ({ product: r.product, variant: r.variant, sku: r.sku, warehouse: r.warehouse, onHand: r.onHand, reserved: r.reserved, available: r.available }))
    .sort((a, b) => b.reserved - a.reserved);
}

/** Negative Stock report — data-integrity guard: any line with onHand or available below zero. */
export async function getNegativeStockReport(businessId: string) {
  const { rows } = await getStockBalance(businessId);
  return rows
    .filter((r) => r.onHand < 0 || r.available < 0)
    .map((r) => ({ product: r.product, variant: r.variant, sku: r.sku, warehouse: r.warehouse, onHand: r.onHand, reserved: r.reserved, available: r.available, status: r.status }))
    .sort((a, b) => a.onHand - b.onHand);
}
