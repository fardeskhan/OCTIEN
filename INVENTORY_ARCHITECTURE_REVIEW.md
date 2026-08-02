# Inventory Architecture Review — CAP-INVENTORY V1.0 freeze gate

**Date:** 2026-07-26 · **Scope:** the Inventory capability — the system of record for physical stock
and valuation (movements → projection → WAC → reservation → picking → dispatch → stock-out →
valuation → ledger → dashboard → reports → Inventory 360 → audit). This is a documented release gate,
not a casual check. Every ✅ is backed by something actually run against the **live Neon database**
this gate, or verified by direct code inspection at the cited location.

Inventory is consumed by Sales (reservation, stock-out on dispatch) and Procurement (stock-in +
WAC on goods receipt). Those two capabilities are frozen; the shared handlers they use were edited
during this program only with regression re-verification (Sales 25/25, Procurement 18/18).

## 1. Domain Architecture
| Check | Result | Notes |
|---|---|---|
| Inventory is the single system of record for stock + valuation | ✅ | `InventoryVariantProjection` (onHand/reserved/available/averageCost) + append-only `StockMovementRecord` + `ReservationRecord`. Sales/Procurement mutate it only via events. |
| Clean dependency direction | ✅ | UI → `lib/inventory/*` read-model services → `InventoryVariantProjection`/`StockMovementRecord`. UI never re-queries or recomputes stock (the old `valuation`/`movements` pages that did were replaced). |
| No circular dependencies | ✅ | `inventory-dashboard`/`inventory-reports`/`inventory-360` **consume** `stock-balance`/`inventory-valuation`/`stock-ledger`; those consume the projection; none import the composers. |
| Services consume shared abstractions, not duplicated logic | ✅ | Metadata resolvers (`resolveVariantMeta`/`resolveWarehouseMeta`) shared via `inventory-utils`; dashboard reuses valuation (verified `dashboard.inventoryValue == valuation.totalValue`); 360 reuses balance + ledger. |
| One canonical stock-in / stock-out / reservation path | ✅ | Stock-in via `processGoodsReceiptRequest` + `updateVariantProjection`; reservation via `InventoryReservationRequested`; stock-out via `InventoryStockOutRequested` — all replay-guarded. |

## 2. Invariants & Projection Correctness
The four permanent invariants (`lib/verification/inventory-invariants.ts`), asserted after **every**
scenario in the runtime harness:

| Invariant | Result | Evidence |
|---|---|---|
| 1. Ledger-tracking: Δ(projection) = Δ(ledger) | ✅ | Δ onHand == Δ Σmovements and Δ reserved == Δ Σactive-reservations across reserve/cancel/expire/dispatch/replay. |
| 2. Availability: available = onHand − reserved | ✅ | Within-projection identity; a seed-era phantom `reserved` (no backing reservation row) was detected by this invariant and repaired; business-wide scan now **0 inconsistent** of 7 projections. |
| 3. Valuation: value = onHand × averageCost | ✅ | Internally consistent, finite, non-negative unit cost. |
| 4. WAC boundary: averageCost changes only on valuation events | ✅ | Proven unchanged across reservation, picking, packing, ship-prep and dispatch; changes only on receipt/adjustment/return. |

**Architectural finding (documented, not a defect):** the projection is a denormalized read model.
Seeded/production stock was set directly and is **not reconstructable from the movement ledger**
(no opening-balance movements): e.g. a variant with projection onHand 4322 but Σ recorded movements
4260. Therefore the *absolute* identity `onHand = Σmovements` holds only on a warehouse built from
zero; for real data the correct, seed-robust invariant is **delta-tracking** (both sides move
together), which is what the harness enforces. The stock ledger honestly reports Σ movements; the
balance/valuation/360 report the projection — each labelled by source.

## 3. Valuation
| Check | Result | Notes |
|---|---|---|
| WAC ownership boundary | ✅ | Weighted-average cost is owned by the receipt/adjustment path (Procurement); Inventory treats `averageCost` as an immutable input. |
| Valuation rolls up correctly | ✅ | `getInventoryValuation` = Σ onHand × averageCost by variant + warehouse; verified `balance.totalValue == valuation.totalValue == dashboard.inventoryValue == Σ valuation-report == Σ 360 warehouse balances`. |
| WAC verified independently | ✅ | 10-scenario matrix (`/verify-wac`) 10/10; procurement full-chain exact-WAC 18/18. |

## 4. Idempotency (retry-safety)
Both inventory event handlers were unguarded and were **found + fixed by the runtime harness**:

| Event | Fix | Result |
|---|---|---|
| **Stock-OUT** (`InventoryStockOutRequested`, [handlers.ts:363](apps/frontend/src/lib/outbox/handlers.ts:363)) | Early-return guard on the deterministic per-shipment `correlationId = SHP-<shipmentId>`. Previously used a `Date.now()`-based movement id (never colliding) → replay double-deducted. | ✅ replay → one movement, onHand unchanged |
| **Reservation** (`InventoryReservationRequested`, [handlers.ts:183](apps/frontend/src/lib/outbox/handlers.ts:183)) | Guard on an existing ACTIVE/FULFILLED reservation for (order, inventory). Scoped to ACTIVE/FULFILLED so re-reservation after CANCELLED/EXPIRED still works. | ✅ replay → one reservation, reserved not doubled |

Reservation lifecycle proven end-to-end: reserve · double/replay · cancel · **re-reserve after
cancel** · expire · all-or-nothing (request > available → nothing reserved).

## 5. Read Models & Tie-Outs (release gate)
Verified in the harness (`/verify-inventory` Part D) against live Neon:
- stock-balance value == valuation value ✅
- dashboard inventoryValue == valuation value (reuse, no recompute) ✅
- valuation report Σ == valuation value ✅
- warehouse-stock report lines == balance lines ✅
- valuation by-warehouse Σ == total; availability Σ == balance available ✅
- Inventory 360 value == Σ its warehouse balances ✅
- stock-ledger closing == Σ recorded movements (ledger self-consistent) ✅

## 6. Shared Components
| Component | Reused by | Result |
|---|---|---|
| Enterprise UI kit (`components/enterprise/*`) | every inventory page | ✅ |
| Config-driven reporting (`EnterpriseReportLayout`/`EnterpriseReportTable`) | movements, valuation, 7 report subpages, ledger | ✅ |
| Chart wrappers (`StandardBarChart`) | dashboard, valuation, summary | ✅ |
| Invariant kit (`inventory-invariants.ts`) | runtime harness | ✅ (emerging shared verification kit) |
| Audit (`logAudit`) | inventory actions | ✅ (call-sites; store verified writable + business-scoped) |
| Metadata resolvers (`inventory-utils`) | all read models | ✅ |

## 7. Security
| Check | Result | Evidence |
|---|---|---|
| RBAC enforced | ✅ | Reads gate `inventory.read`; mutations gate `inventory.update`; layout `requireAnyRole(["Operations","Warehouse"])` (Owner super-admin bypasses). |
| Audit on mutations | ✅ | `logAudit` at inventory actions; audit store verified writable + readable + business-scoped at runtime. |
| Multi-tenant isolation | ✅ | Every query scoped by `businessId`; runtime cross-business audit lookup returned nothing. |

## 8. Technical Debt & Known Limitations (intentional, remaining)
1. **No reorder-point / min-stock / safety-stock model.** "Low stock" is a documented heuristic (`available ≤ 10`; `onHand ≤ 0` = out-of-stock) in `inventory-utils.stockStatus` — the single place to change when reorder points are modelled.
2. **Projection not reconstructable from the movement ledger** for seeded/opening stock (no opening-balance movements); stock-ledger closing balance can differ from projection on-hand. Surfaced honestly in the UI and 360.
3. **No automated reservation-expiry sweeper** — `ReservationRecord.expiresAt` is currently decorative; expiry requires a status change nothing performs.
4. **Picking/packing are `ShipmentLine` markers** (pickedQty/packedQty/shippedQty), not inventory movements — they intentionally do not move stock or change WAC (proven). There are no PickList/CycleCount/StockTransfer/Adjustment aggregate models.
5. **Dual projection maintenance** — `updateVariantProjection` recomputes from the ledger while the outbox handlers mutate incrementally. Verified consistent; consolidating (or adding opening-balance movements) is a future hardening.
6. **Report exports are CSV + Print only** (via the shared table); native PDF/XLSX deferred.
7. **`event.payload as any` / `tx: any`** persist in the shared handlers/actions (documented cross-module debt; typed event payloads deferred).

A one-time data repair was applied this gate: a phantom `reserved` value on one seeded projection
(no backing reservation row) that violated invariant 2; recomputed from the reservation ledger.

## Runtime gate (this review)
| Gate | Result |
|---|---|
| End-to-end runtime (`/api/dev/verify-inventory`) | ✅ **78/78** on live Neon (Salam Cola) |
| WAC matrix (`/verify-wac`) | ✅ 10/10 |
| Idempotency (`/verify-idempotency`) | ✅ 7/7 |
| Sales regression (`/verify-sales`) | ✅ 25/25 |
| Procurement regression (`/verify-procurement`) | ✅ 18/18 |
| `tsc --noEmit` | ✅ EXIT 0 |
| `npm run build` | ✅ EXIT 0 (all inventory routes emit) |
| ESLint (new inventory code) | ✅ 0 errors |
| Projection consistency (business-wide) | ✅ 0 inconsistent of 7 |

## Final end-to-end scenario (verified this gate)
Movement types → Projection identity → Reservation (reserve/replay/cancel/re-reserve/expire/
all-or-nothing) → Picking (pick/partial/unpick/pack/ship-prep — no stock/WAC change) → **Dispatch →
Stock-out (replay-safe)** → Valuation → Stock Ledger → Dashboard → Reports → Inventory 360 → Audit →
**read-model tie-out → invariant check**. Every step succeeds and the read models reconcile.

## Verdict
**Inventory architecture is sound and internally consistent — it mirrors the frozen CAP-SALES and
CAP-PROCUREMENT patterns and closes the Sales/Procurement stock-integrity gaps (stock-out replay).**
Cleared to freeze as **CAP-INVENTORY V1.0**, subject to the known limitations recorded in
`CAP_INVENTORY_V1_RELEASE.md`.
