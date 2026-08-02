/**
 * Weighted Average Cost (moving average) — the single, tested valuation primitive. Every inventory
 * receipt updates cost through THIS function so the maths lives in one place and can be verified
 * deterministically (see lib/verification/wac-runtime.ts).
 *
 * Precision policy:
 *  - internal calculations use JS number (IEEE-754 double) at full precision;
 *  - stored `averageCost` is Prisma Decimal (defined scale);
 *  - UI rounds for display.
 *  Verification compares to a tolerance of 1e-6 (well tighter than any stored/displayed rounding).
 *
 * Invariant: value = qty × avgCost. A receipt blends cost; an issue (consumption / return to
 * supplier) leaves avgCost unchanged and only reduces quantity/value.
 */

export interface StockState {
  qty: number;
  avgCost: number;
}

export const stockValue = (s: StockState): number => s.qty * s.avgCost;

/** New moving-average cost after receiving `recvQty` at `recvUnitCost`. */
export function weightedAverageCost(prevQty: number, prevAvgCost: number, recvQty: number, recvUnitCost: number): number {
  const newQty = prevQty + recvQty;
  if (newQty <= 0) return recvUnitCost;
  const newValue = prevQty * prevAvgCost + recvQty * recvUnitCost;
  return newValue / newQty;
}

/** Apply a receipt: quantity increases, cost is blended. */
export function applyReceipt(s: StockState, recvQty: number, recvUnitCost: number): StockState {
  return { qty: s.qty + recvQty, avgCost: weightedAverageCost(s.qty, s.avgCost, recvQty, recvUnitCost) };
}

/** Apply an issue (consumption or purchase return): quantity decreases at the current average cost. */
export function applyIssue(s: StockState, issueQty: number): StockState {
  return { qty: s.qty - issueQty, avgCost: s.avgCost };
}
