# CAP-INVENTORY V1.0 — Release Notes

**Module:** OCTIEN Inventory · **Status:** ✅ **PRODUCTION READY (frozen)**
**Date:** 2026-07-26 · **Verified against:** live Neon PostgreSQL (Salam Cola)

CAP-INVENTORY V1.0 is the **third production-complete transactional domain** in OCTIEN, built to the
same architecture, workflows, reporting, verification and documentation discipline as the frozen
CAP-SALES V1.0 and CAP-PROCUREMENT V1.0. It is the **system of record for physical stock and
valuation**; Sales and Procurement consume it. It should now receive only bug fixes and intentional
enhancements — not architectural changes.

## Overview
Inventory owns the physical stock position (on-hand / reserved / available per variant and warehouse)
and its valuation (moving weighted-average cost). It records every stock change as an append-only
movement, maintains a projection read model, guarantees replay-safe reservation and stock-out, and
surfaces the whole position through a dashboard, a stock ledger, valuation, a movement register, a
reports hub and an Inventory 360 — every screen a thin presentation layer over verified services.

## Architecture
- **Domain services own the logic** (`lib/inventory/*`: stock-balance, stock-ledger,
  inventory-valuation, inventory-dashboard, inventory-reports, inventory-360, inventory-utils), all
  derived from the verified source-of-truth tables (`InventoryVariantProjection`,
  `StockMovementRecord`, `ReservationRecord`) — never the unwired DDD projection tables.
- **Event-driven side effects** via the outbox: `InventoryReservationRequested` (reserve),
  `InventoryStockOutRequested` (stock-out), `GoodsReceiptCompleted` (stock-in + WAC) — all
  **idempotent on replay**.
- **Permanent invariants** (`lib/verification/inventory-invariants.ts`): ledger-tracking,
  availability, valuation, WAC boundary — asserted after every runtime scenario.
- **One design system** (`components/enterprise/*`) + config-driven reporting + chart wrappers.
- **Runtime verification harness** (`lib/verification/inventory-runtime.ts` + `/api/dev/verify-inventory`).

## Transaction flow
Movement (IN/OUT/TRANSFER/ADJUSTMENT/RETURN) → Projection → WAC → Reservation → Picking → Packing →
Dispatch → Stock-Out → Valuation → Stock Ledger → Dashboard → Reports → Inventory 360 → Audit.

## Inventory valuation
- Value = Σ (onHand × averageCost). WAC is owned by the receipt/adjustment path (Procurement);
  Inventory treats `averageCost` as an immutable input (WAC-boundary invariant).
- Verified: balance value == valuation value == dashboard KPI == Σ valuation-report == Σ 360
  warehouse balances.

## Reservation & stock-out safety
- Reservation lifecycle: reserve · double/replay (idempotent) · cancel (releases + restores) ·
  **re-reserve after cancel** · expire · all-or-nothing (request > available reserves nothing).
- **Stock-OUT is replay-safe** (guarded on the per-shipment correlationId) — this closes the
  cross-module gap logged in CAP-PROCUREMENT.

## Implemented UI (thin over services)
- **Dashboard** — executive KPIs, value-by-warehouse, warehouse summary, fast/slow movers,
  low/out-of-stock, recent movements.
- **Stock Ledger** — variant picker → per-variant running balance, warehouse filter, type filter,
  search, CSV export, drill to 360.
- **Valuation** — KPIs, value-by-warehouse chart, warehouse valuation, variant table with **ABC**
  classification.
- **Movement Register** — every movement with IN/OUT/ADJUSTMENT badges, search, export.
- **Reports Hub** — Warehouse Stock, Valuation, Slow-Moving, Fast-Moving, Reserved, Negative,
  Inventory Summary (printable).
- **Inventory 360** — overview, valuation snapshot, warehouse balances, reservations, movement
  history, merged timeline.

## Security · Permissions · Audit
- RBAC: reads `inventory.read`; mutations `inventory.update`; layout `requireAnyRole(["Operations","Warehouse"])` (Owner bypasses).
- Every mutation is audited (`logAudit`); the audit store is business-scoped.
- Multi-tenant: all queries scoped by `businessId` (cross-business isolation verified at runtime).

## Verification results (consolidated)
| Verification | Result |
|---|---|
| End-to-end runtime (`/api/dev/verify-inventory`) | ✅ **78/78** |
| WAC matrix (`/verify-wac`) | ✅ 10/10 |
| Idempotency (`/verify-idempotency`) | ✅ 7/7 |
| Sales regression (`/verify-sales`) | ✅ 25/25 |
| Procurement regression (`/verify-procurement`) | ✅ 18/18 |
| Read-model tie-outs (balance=valuation=dashboard=360=report) | ✅ |
| Projection consistency (business-wide) | ✅ 0 inconsistent / 7 |
| `npm run build` | ✅ EXIT 0 |
| `tsc --noEmit` | ✅ EXIT 0 |
| ESLint (new inventory code) | ✅ 0 errors |
| Authenticated render (all 14 inventory routes) | ✅ HTTP 200 |

All run against live Neon (Salam Cola). Full detail: [INVENTORY_ARCHITECTURE_REVIEW.md](INVENTORY_ARCHITECTURE_REVIEW.md).

## Known limitations (explicit, not hidden)
1. **No reorder-point / min-stock model** — "low stock" is a documented heuristic (`available ≤ 10`;
   `onHand ≤ 0` = out-of-stock), centralised in `inventory-utils.stockStatus`.
2. **Projection not reconstructable from the movement ledger** for seeded/opening stock (no
   opening-balance movements); stock-ledger closing balance can differ from projection on-hand.
   Surfaced honestly in the UI/360.
3. **No automated reservation-expiry sweeper** — `expiresAt` is decorative until a job runner exists.
4. **Picking/packing are `ShipmentLine` markers**, not inventory movements (by design — no stock/WAC
   change). No PickList/CycleCount/StockTransfer/Adjustment aggregate models.
5. **Report exports are CSV + Print only** — native PDF/XLSX deferred.
6. **Dual projection maintenance** (recompute vs incremental) — verified consistent; consolidation
   deferred.

## Cross-module follow-ups
- **Stock-OUT replay guard** logged in CAP-PROCUREMENT is now ✅ **resolved** here.
- **Typed event payloads** (retire `event.payload as any` / `tx: any`) remains a cross-module cleanup.
- **Background job runner / Operations Center** (`OPERATIONS_CENTER_DESIGN.md`) would enable the
  reservation-expiry sweeper and async outbox processing — deferred to the platform phase.

## Future enhancements
- Reorder points + automated replenishment suggestions.
- Cycle counting + physical adjustment workflow (with audit).
- Opening-balance movements so the projection is fully rebuildable from the ledger.
- PDF/XLSX exports + saved report presets.

## Release status
**CAP-INVENTORY V1.0 — PRODUCTION READY.** Frozen. OCTIEN now has **three** fully verified
transactional domains — Sales, Procurement and Inventory — on one enterprise architecture.
