/**
 * Stock Ledger & Movement Timeline read models — the quantity-side mirror of the vendor/customer
 * ledger, built from the append-only `StockMovementRecord` table. The stock ledger is a per-variant
 * (optionally per-warehouse) running balance of signed movements; the movement timeline is a
 * chronological feed for the timeline UI. This is the audit trail behind every projection number.
 */
import { db } from "@/lib/db";
import { resolveVariantMeta, resolveWarehouseMeta, round2 } from "./inventory-utils";

export interface StockLedgerLine {
  date: Date;
  type: string;
  warehouse: string;
  reference: string; // correlationId (SHP-…, GR-…, TRF-…) or "—"
  actor: string;
  quantityIn: number;
  quantityOut: number;
  quantity: number; // signed
  runningBalance: number;
}

export interface StockLedger {
  variantId: string;
  variant: string;
  sku: string;
  product: string;
  unit: string;
  warehouseId: string | null; // null = across all warehouses
  warehouse: string | null;
  lines: StockLedgerLine[];
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  movementCount: number;
}

export async function getStockLedger(businessId: string, variantId: string, warehouseId?: string): Promise<StockLedger | null> {
  const [variantMeta, warehouseMeta] = await Promise.all([resolveVariantMeta(businessId), resolveWarehouseMeta(businessId)]);
  const vm = variantMeta.get(variantId);
  if (!vm) return null;

  const movements = await db.stockMovementRecord.findMany({
    where: { businessId, variantId, ...(warehouseId ? { warehouseId } : {}) },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });

  let running = 0;
  let totalIn = 0;
  let totalOut = 0;
  const lines: StockLedgerLine[] = movements.map((m) => {
    const q = m.quantityValue;
    running += q;
    if (q >= 0) totalIn += q; else totalOut += -q;
    return {
      date: m.occurredAt,
      type: m.type,
      warehouse: warehouseMeta.get(m.warehouseId)?.name ?? "—",
      reference: m.correlationId ?? "—",
      actor: m.actorId,
      quantityIn: q >= 0 ? q : 0,
      quantityOut: q < 0 ? -q : 0,
      quantity: q,
      runningBalance: round2(running),
    };
  });

  return {
    variantId,
    variant: vm.variant,
    sku: vm.sku,
    product: vm.product,
    unit: vm.unit,
    warehouseId: warehouseId ?? null,
    warehouse: warehouseId ? warehouseMeta.get(warehouseId)?.name ?? "—" : null,
    lines,
    totalIn: round2(totalIn),
    totalOut: round2(totalOut),
    closingBalance: round2(running),
    movementCount: lines.length,
  };
}

export interface TimelineMovement {
  date: Date;
  variantId: string;
  variant: string;
  sku: string;
  product: string;
  warehouse: string;
  type: string;
  quantity: number; // signed
  unit: string;
  reference: string;
  actor: string;
}

/** Chronological (newest-first) movement feed across the business, optionally scoped to a variant. */
export async function getMovementTimeline(businessId: string, opts?: { variantId?: string; limit?: number }): Promise<TimelineMovement[]> {
  const [variantMeta, warehouseMeta] = await Promise.all([resolveVariantMeta(businessId), resolveWarehouseMeta(businessId)]);
  const movements = await db.stockMovementRecord.findMany({
    where: { businessId, ...(opts?.variantId ? { variantId: opts.variantId } : {}) },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: opts?.limit ?? 100,
  });
  return movements.map((m) => {
    const vm = variantMeta.get(m.variantId);
    return {
      date: m.occurredAt,
      variantId: m.variantId,
      variant: vm?.variant ?? "—",
      sku: vm?.sku ?? "—",
      product: vm?.product ?? "—",
      warehouse: warehouseMeta.get(m.warehouseId)?.name ?? "—",
      type: m.type,
      quantity: m.quantityValue,
      unit: m.quantityUnit,
      reference: m.correlationId ?? "—",
      actor: m.actorId,
    };
  });
}
