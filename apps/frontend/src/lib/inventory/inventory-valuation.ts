/**
 * Inventory Valuation read model — value = Σ (onHand × averageCost), the moving-weighted-average
 * valuation owned by the receipt/adjustment path (Inventory treats averageCost as an immutable input;
 * see the WAC-boundary invariant). Rolls up by variant and by warehouse from
 * `InventoryVariantProjection`.
 */
import { db } from "@/lib/db";
import { resolveVariantMeta, resolveWarehouseMeta, round2 } from "./inventory-utils";

export interface ValuationByVariant {
  variantId: string;
  variant: string;
  sku: string;
  product: string;
  unit: string;
  onHand: number;
  averageCost: number;
  value: number;
}

export interface ValuationByWarehouse {
  warehouseId: string;
  warehouse: string;
  units: number;
  value: number;
  lines: number;
}

export interface InventoryValuation {
  byVariant: ValuationByVariant[];
  byWarehouse: ValuationByWarehouse[];
  totalUnits: number;
  totalValue: number;
  variantCount: number;
  warehouseCount: number;
}

export async function getInventoryValuation(businessId: string): Promise<InventoryValuation> {
  const [projections, variantMeta, warehouseMeta] = await Promise.all([
    db.inventoryVariantProjection.findMany({ where: { businessId } }),
    resolveVariantMeta(businessId),
    resolveWarehouseMeta(businessId),
  ]);

  // By variant — sum across warehouses; value uses each projection's own averageCost, then report a
  // value-weighted average cost for the variant (avoids mixing per-warehouse costs incorrectly).
  const variantAgg = new Map<string, { onHand: number; value: number }>();
  const warehouseAgg = new Map<string, { units: number; value: number; lines: number }>();

  for (const p of projections) {
    const onHand = p.onHandQuantity;
    const value = onHand * p.averageCost.toNumber();
    const v = variantAgg.get(p.variantId) ?? { onHand: 0, value: 0 };
    v.onHand += onHand;
    v.value += value;
    variantAgg.set(p.variantId, v);

    const w = warehouseAgg.get(p.warehouseId) ?? { units: 0, value: 0, lines: 0 };
    w.units += onHand;
    w.value += value;
    w.lines += 1;
    warehouseAgg.set(p.warehouseId, w);
  }

  const byVariant: ValuationByVariant[] = [...variantAgg.entries()].map(([variantId, agg]) => {
    const vm = variantMeta.get(variantId);
    return {
      variantId,
      variant: vm?.variant ?? "—",
      sku: vm?.sku ?? "—",
      product: vm?.product ?? "—",
      unit: vm?.unit ?? "pcs",
      onHand: round2(agg.onHand),
      averageCost: agg.onHand > 0 ? round2(agg.value / agg.onHand) : 0,
      value: round2(agg.value),
    };
  });
  byVariant.sort((a, b) => b.value - a.value);

  const byWarehouse: ValuationByWarehouse[] = [...warehouseAgg.entries()].map(([warehouseId, agg]) => ({
    warehouseId,
    warehouse: warehouseMeta.get(warehouseId)?.name ?? "—",
    units: round2(agg.units),
    value: round2(agg.value),
    lines: agg.lines,
  }));
  byWarehouse.sort((a, b) => b.value - a.value);

  return {
    byVariant,
    byWarehouse,
    totalUnits: round2(byWarehouse.reduce((s, w) => s + w.units, 0)),
    totalValue: round2(byWarehouse.reduce((s, w) => s + w.value, 0)),
    variantCount: byVariant.length,
    warehouseCount: byWarehouse.length,
  };
}
