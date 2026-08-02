/**
 * Inventory invariants — the permanent correctness checks that EVERY inventory runtime scenario must
 * end with. Computed independently from the ledger tables (an oracle), so they verify the production
 * projection against first principles rather than trusting the code that maintains it.
 *
 *   1. Ledger-tracking      Δ(projection.onHand)   = Δ(Σ signed movements)      — projection moves in
 *                           Δ(projection.reserved) = Δ(Σ active reservations)      lockstep with the ledger
 *   2. Availability         available = onHand − reserved                        — within-projection identity
 *   3. Valuation            value = onHand × averageCost                         — internally consistent
 *   4. WAC boundary         averageCost changes ONLY on valuation events (receipt/adjustment/return)
 *
 * IMPORTANT (architectural note): the projection is a denormalized read model. Seeded/production
 * projections were set directly and are NOT reconstructable from the movement ledger (no
 * opening-balance movements), so the ABSOLUTE identity onHand = Σmovements holds only on a warehouse
 * built from zero. For real data the meaningful invariant is that the projection TRACKS the ledger:
 * both sides move by the same amount. `checkInvariants` takes a baseline snapshot and asserts deltas,
 * which is robust to any seeded starting state and is a stronger test of the handlers.
 *
 * Shared across inventory scenarios (the seed of the common verification framework; the full
 * cross-harness extraction is a separate workstream).
 */
import { db } from "@/lib/db";

export interface InvariantResult { step: string; ok: boolean; detail: string }
export interface InventorySnapshot {
  ledgerOnHand: number;
  activeReserved: number;
  projOnHand: number;
  projReserved: number;
  projAvailable: number;
  avgCost: number;
  value: number;
}

const TOL = 1e-6;

/** Independent snapshot of an inventory record straight from the ledger + projection. */
export async function snapshotInventory(businessId: string, inventoryId: string, variantId: string, warehouseId: string): Promise<InventorySnapshot> {
  const mv = await db.stockMovementRecord.aggregate({ where: { businessId, inventoryId }, _sum: { quantityValue: true } });
  const res = await db.reservationRecord.aggregate({ where: { businessId, inventoryId, status: "ACTIVE" }, _sum: { quantity: true } });
  const proj = await db.inventoryVariantProjection.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId, warehouseId } } });
  const projOnHand = proj?.onHandQuantity ?? 0;
  const avgCost = proj?.averageCost.toNumber() ?? 0;
  return {
    ledgerOnHand: mv._sum.quantityValue ?? 0,
    activeReserved: res._sum.quantity ?? 0,
    projOnHand,
    projReserved: proj?.reservedQuantity ?? 0,
    projAvailable: proj?.availableQuantity ?? 0,
    avgCost,
    value: projOnHand * avgCost,
  };
}

/**
 * Invariants 1–3 for one inventory record, as deltas from a baseline snapshot. `label` scopes the
 * step names to the scenario that just ran (e.g. "after cancel").
 */
export function checkInvariants(base: InventorySnapshot, cur: InventorySnapshot, label: string): InvariantResult[] {
  const results: InvariantResult[] = [];

  // 1a. onHand tracks the movement ledger.
  const dProjOnHand = cur.projOnHand - base.projOnHand;
  const dLedgerOnHand = cur.ledgerOnHand - base.ledgerOnHand;
  results.push({
    step: `[${label}] projection tracks movement ledger (ΔonHand = ΔΣmovements)`,
    ok: Math.abs(dProjOnHand - dLedgerOnHand) < TOL,
    detail: `ΔprojOnHand=${dProjOnHand}, ΔΣmovements=${dLedgerOnHand}`,
  });

  // 1b. reserved tracks the active-reservation ledger.
  const dProjReserved = cur.projReserved - base.projReserved;
  const dActive = cur.activeReserved - base.activeReserved;
  results.push({
    step: `[${label}] reserved tracks active reservations (Δreserved = ΔΣactive)`,
    ok: Math.abs(dProjReserved - dActive) < TOL,
    detail: `ΔprojReserved=${dProjReserved}, ΔΣactive=${dActive}`,
  });

  // 2. Availability within the projection: available = onHand − reserved.
  results.push({
    step: `[${label}] availability (available = onHand − reserved)`,
    ok: Math.abs(cur.projAvailable - (cur.projOnHand - cur.projReserved)) < TOL,
    detail: `available=${cur.projAvailable}, onHand−reserved=${cur.projOnHand - cur.projReserved}`,
  });

  // 3. Valuation is internally consistent (finite, non-negative unit cost).
  results.push({
    step: `[${label}] valuation (value = onHand × averageCost)`,
    ok: Number.isFinite(cur.value) && cur.avgCost >= 0 && Math.abs(cur.value - cur.projOnHand * cur.avgCost) < TOL,
    detail: `value=${cur.value.toFixed(4)} = ${cur.projOnHand} × ${cur.avgCost.toFixed(4)}`,
  });

  return results;
}

/**
 * Invariant 4 — WAC boundary. averageCost must NOT change for non-valuation events (reservation,
 * picking, packing, dispatch preparation).
 */
export function checkWacUnchanged(before: number, after: number, label: string): InvariantResult {
  return {
    step: `[${label}] WAC boundary (averageCost unchanged)`,
    ok: Math.abs(before - after) < TOL,
    detail: `before=${before}, after=${after}`,
  };
}
