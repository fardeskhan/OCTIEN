import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStockBalance, getInventoryAvailability } from "@/lib/inventory/stock-balance";
import { getStockLedger, getMovementTimeline } from "@/lib/inventory/stock-ledger";
import { getInventoryValuation } from "@/lib/inventory/inventory-valuation";
import { getInventoryDashboard } from "@/lib/inventory/inventory-dashboard";
import { getWarehouseStockReport, getInventoryValuationReport, getStockMovementRegister, getSlowMovingReport } from "@/lib/inventory/inventory-reports";
import { getInventory360 } from "@/lib/inventory/inventory-360";

/** Dev-only smoke of the inventory read-model services against live data. */
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "nope" }, { status: 404 });
  const variant = await db.productVariant.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
  if (!variant) return NextResponse.json({ error: "no variant" });
  const businessId = variant.businessId;

  const [balance, availability, valuation, ledger, timeline, dashboard, whReport, valReport, movReg, slowReport, v360] = await Promise.all([
    getStockBalance(businessId),
    getInventoryAvailability(businessId),
    getInventoryValuation(businessId),
    getStockLedger(businessId, variant.id),
    getMovementTimeline(businessId, { limit: 5 }),
    getInventoryDashboard(businessId),
    getWarehouseStockReport(businessId),
    getInventoryValuationReport(businessId),
    getStockMovementRegister(businessId, { limit: 50 }),
    getSlowMovingReport(businessId),
    getInventory360(businessId, variant.id),
  ]);

  // Tie-outs (all must be true): balance==valuation; dashboard KPI==valuation; 360 value==its warehouse sum.
  const tieOuts = {
    balanceEqValuation: Math.abs(balance.totals.totalValue - valuation.totalValue) < 1,
    dashboardEqValuation: Math.abs(dashboard.kpis.inventoryValue - valuation.totalValue) < 1,
    v360Consistent: v360 ? Math.abs(v360.summary.value - v360.warehouseBalances.reduce((s, w) => s + w.value, 0)) < 1 : false,
    valReportEqValuation: Math.abs(valReport.reduce((s, r) => s + r.value, 0) - valuation.totalValue) < 2,
  };

  return NextResponse.json({
    businessId,
    tieOuts,
    allTieOutsPass: Object.values(tieOuts).every(Boolean),
    stockBalance: { ...balance.totals, sampleRow: balance.rows[0] },
    availabilityRows: availability.length,
    valuation: { totalUnits: valuation.totalUnits, totalValue: valuation.totalValue, variantCount: valuation.variantCount, byWarehouse: valuation.byWarehouse },
    firstVariantLedger: ledger ? { variant: ledger.variant, movementCount: ledger.movementCount, totalIn: ledger.totalIn, totalOut: ledger.totalOut, closingBalance: ledger.closingBalance } : null,
    recentMovements: timeline.length,
    dashboard: { kpis: dashboard.kpis, warehouseSummary: dashboard.warehouseSummary, fastMovers: dashboard.fastMovers.slice(0, 3), lowStockCount: dashboard.lowStock.length, alerts: dashboard.alerts },
    reports: { warehouseStockRows: whReport.length, valuationRows: valReport.length, movementRegisterRows: movReg.length, slowMovingTop: slowReport[0] },
    inventory360: v360 ? { variant: v360.variant.name, onHand: v360.summary.onHand, value: v360.summary.value, warehouses: v360.warehouseBalances.length, reservations: v360.reservations.length, movements: v360.summary.movements, timeline: v360.timeline.length } : null,
  });
}
