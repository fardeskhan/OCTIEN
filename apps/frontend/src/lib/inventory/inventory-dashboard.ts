/**
 * InventoryDashboardService — thin ORCHESTRATION layer (mirror of the Sales/Procurement dashboards).
 * Composes the inventory read models (stock-balance, valuation) + lightweight aggregates into widget
 * DTOs. Does NOT recompute stock or valuation — those come from the read-model services, which draw
 * from the verified `InventoryVariantProjection` + `StockMovementRecord`.
 */
import { db } from "@/lib/db";
import { getStockBalance } from "./stock-balance";
import { getInventoryValuation } from "./inventory-valuation";
import { getMovementTimeline } from "./stock-ledger";
import { resolveVariantMeta } from "./inventory-utils";

export interface InventoryDashboardDTO {
  kpis: {
    inventoryValue: number;
    skuCount: number;
    onHandUnits: number;
    reservedUnits: number;
    availableUnits: number;
    warehouseCount: number;
    outOfStock: number;
    lowStock: number;
  };
  valueByWarehouse: { warehouse: string; value: number }[];
  lowStock: { product: string; variant: string; warehouse: string; onHand: number; available: number; status: string }[];
  reservedStock: { product: string; variant: string; warehouse: string; reserved: number }[];
  fastMovers: { product: string; variant: string; movement: number }[];
  slowMovers: { product: string; variant: string; movement: number }[];
  warehouseSummary: { warehouse: string; skuLines: number; units: number; value: number }[];
  recentMovements: { date: Date; type: string; product: string; variant: string; warehouse: string; quantity: number; unit: string }[];
  alerts: { label: string; value: string; tone: "danger" | "warning" | "info" }[];
}

export async function getInventoryDashboard(businessId: string): Promise<InventoryDashboardDTO> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [balance, valuation, variantMeta, outMovements, negativeStock, timeline] = await Promise.all([
    getStockBalance(businessId),
    getInventoryValuation(businessId),
    resolveVariantMeta(businessId),
    // Outbound movement volume in the last 30 days → mover velocity (FULFILLED/TRANSFERRED_OUT etc.).
    db.stockMovementRecord.groupBy({ by: ["variantId"], where: { businessId, quantityValue: { lt: 0 }, occurredAt: { gte: thirtyDaysAgo } }, _sum: { quantityValue: true } }),
    db.inventoryVariantProjection.count({ where: { businessId, onHandQuantity: { lt: 0 } } }),
    getMovementTimeline(businessId, { limit: 8 }),
  ]);

  const t = balance.totals;

  // Movers by outbound volume (absolute).
  const movers = outMovements
    .map((g) => ({ variantId: g.variantId, movement: Math.abs(g._sum.quantityValue ?? 0) }))
    .filter((m) => m.movement > 0)
    .map((m) => { const vm = variantMeta.get(m.variantId); return { product: vm?.product ?? "—", variant: vm?.variant ?? "—", movement: Math.round(m.movement) }; });
  const fastMovers = [...movers].sort((a, b) => b.movement - a.movement).slice(0, 5);
  const slowMovers = [...movers].sort((a, b) => a.movement - b.movement).slice(0, 5);

  const lowStock = balance.rows
    .filter((r) => r.status !== "OK")
    .slice(0, 10)
    .map((r) => ({ product: r.product, variant: r.variant, warehouse: r.warehouse, onHand: r.onHand, available: r.available, status: r.status }));

  const reservedStock = balance.rows
    .filter((r) => r.reserved > 0)
    .sort((a, b) => b.reserved - a.reserved)
    .slice(0, 10)
    .map((r) => ({ product: r.product, variant: r.variant, warehouse: r.warehouse, reserved: r.reserved }));

  const warehouseSummary = valuation.byWarehouse.map((w) => ({ warehouse: w.warehouse, skuLines: w.lines, units: w.units, value: w.value }));

  const alerts: InventoryDashboardDTO["alerts"] = [];
  if (negativeStock > 0) alerts.push({ label: "Negative on-hand lines", value: String(negativeStock), tone: "danger" });
  if (t.outOfStock > 0) alerts.push({ label: "Out-of-stock lines", value: String(t.outOfStock), tone: "danger" });
  if (t.lowStock > 0) alerts.push({ label: "Low-stock lines", value: String(t.lowStock), tone: "warning" });
  if (t.totalReserved > 0) alerts.push({ label: "Units reserved", value: String(Math.round(t.totalReserved)), tone: "info" });

  return {
    kpis: {
      inventoryValue: valuation.totalValue,
      skuCount: t.skuCount,
      onHandUnits: t.totalOnHand,
      reservedUnits: t.totalReserved,
      availableUnits: t.totalAvailable,
      warehouseCount: t.warehouseCount,
      outOfStock: t.outOfStock,
      lowStock: t.lowStock,
    },
    valueByWarehouse: valuation.byWarehouse.map((w) => ({ warehouse: w.warehouse, value: w.value })),
    lowStock,
    reservedStock,
    fastMovers,
    slowMovers,
    warehouseSummary,
    recentMovements: timeline.map((m) => ({ date: m.date, type: m.type, product: m.product, variant: m.variant, warehouse: m.warehouse, quantity: m.quantity, unit: m.unit })),
    alerts,
  };
}
