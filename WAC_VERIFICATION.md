# WAC Verification (CAP-WAC-VERIFICATION)

**Date:** 2026-07-24 · **Scope:** the weighted-average-cost (moving average) valuation used by the
goods-receipt flow. This is a release gate for CAP-PROCUREMENT V1 because Inventory, Finance and all
procurement reporting consume inventory valuation.

## Formula
Moving weighted average, applied on every receipt:

```
newAvgCost = (prevQty × prevAvgCost + recvQty × recvUnitCost) / (prevQty + recvQty)
inventoryValue = qty × avgCost
```

Issues (consumption / purchase returns) reduce quantity at the current average cost and **do not**
change the average. Cancellation must **restore** the pre-receipt state (not issue at the new WAC).

The single implementation lives in `src/lib/finance/wac.ts` (`weightedAverageCost`, `applyReceipt`,
`applyIssue`). Both the handler and the verification use it.

## Precision policy
- Internal calculations: JS `number` (IEEE-754 double), full precision.
- Stored `averageCost`: Prisma `Decimal` (defined scale).
- UI: rounded for display.
- Verification tolerance: **1e-6** (pure matrix) / **0.01** (DB integration) — tighter than any
  stored/displayed rounding.

## Root cause found (and fixed)
The observed drift (146.43 → 146.32 across runs) was a **genuine double-count**. In the
`GoodsReceiptCompleted` handler, `onHand` **already includes the receipt** (the goods-receipt action
increments the projection before the event drains), yet the handler computed:

```
newTotalQty   = totalOnHand + acceptedQty     // ❌ received qty counted TWICE in the denominator
newTotalValue = totalValue  + acceptedQty×price
```

**Fix** (`src/lib/outbox/handlers.ts`): compute against the pre-receipt quantity and blend through
the shared primitive:

```
oldWac  = totalOnHand > 0 ? totalValue / totalOnHand : unitPrice
prevQty = totalOnHand − acceptedQty          // pre-receipt
newWac  = weightedAverageCost(prevQty, oldWac, acceptedQty, unitPrice)
```

## Test matrix — deterministic (`GET /api/dev/verify-wac`) → 10/10 PASS
Each scenario compares the engine's output to an **independently hand-computed** expected value.

| Scenario | Qty | WAC | Inventory Value | Result |
|---|---|---|---|---|
| Empty → first receipt (5@100) | 5 | 100 | 500 | ✅ |
| Higher-cost (10@100, 5@200) | 15 | 133.333333 | 2000 | ✅ |
| Lower-cost (10@100, 5@50) | 15 | 83.333333 | 1250 | ✅ |
| Partial receipt (4@100) | 4 | 100 | 400 | ✅ |
| Multiple (10@100,10@200,5@300) | 25 | 180 | 4500 | ✅ |
| Purchase return (…, return 5) | 15 | 150 (unchanged) | 2250 | ✅ |
| Inventory adjustment (−3) | 17 | 150 (unchanged) | 2550 | ✅ |
| Consumption after receipt (−6) | 9 | 133.333333 | 1200 | ✅ |
| Backdated receipt | 15 | 83.333333 | 1250 | ✅ |
| Cancelled receipt (restore) | 10 | 100 | 1000 | ✅ |

## Handler integration (`GET /api/dev/verify-procurement`) → 10/10 PASS
A real goods receipt run through the actual handler now yields the **exact** expected average cost:
`averageCost = 146.0984 (expected 146.0984 from 4309 @ 146.21 + 5 @ 50)`. Inventory quantity +qty,
AP posts DR 1200 / CR 2000, payment posts DR 2000 / CR 1000, **General Ledger balanced**.

## Documented behaviours / limitations
- **Backdated receipts**: moving-average WAC is order-sensitive and is applied in event-processing
  order; it does not retroactively re-sequence history. A backdated receipt blends at the time it is
  processed. (Periodic/retroactive revaluation is out of scope for V1.)
- **Cancellation**: correct behaviour is to *restore* the pre-receipt state; a naïve issue-at-WAC
  would leave the average wrong. Receipt cancellation as a user action is not yet wired — this
  documents the required semantics for when it is.
- The verification restores all of a variant's projection average costs on cleanup, so runs are
  non-mutating.

## Regression status
`tsc` ✅ · `build` ✅ · lint ✅ · pure WAC matrix **10/10** · procurement runtime **10/10** (exact
WAC + GL balanced). **WAC is verified and correct.**
