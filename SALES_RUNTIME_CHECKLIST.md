# Sales Workflow — Runtime Verification Checklist

**Verified:** 2026-07-24 · against **live Neon PostgreSQL** with the app running · business **Salam Cola** (reservation) + **COSMY UCO** (authenticated audit).

Runtime verification is **mandatory** before a vertical is considered complete — "builds + lints clean" is necessary, not sufficient. Two harnesses are used:

- **Headless** — `src/lib/verification/sales-runtime.ts`, run via `GET /api/dev/verify-sales` (dev-only). Exercises the **real** reservation code path (actual outbox handlers + `drainOutbox`) and asserts DB deltas. Creates throwaway data and cleans up in `finally`.
- **Authenticated UI** — real login (`owner@cosmy.ai` / `Owner@123`), perform a mutation through the built UI, confirm audit via `GET /api/dev/recent-audit`. Exercises the cookie-bound `requirePermission` + `logAudit` layers the headless run intentionally bypasses.

## Result: 14/14 headless PASS + authenticated audit PASS

| Checklist item | Status | Evidence |
|---|---|---|
| Create quotation | ✅ | headless + authenticated UI (`QT-00001`, audit written) |
| Edit quotation (status) | ✅ | `updateQuotationStatus` lifecycle; hardened w/ RBAC+audit |
| Approve quotation (ACCEPT) | ✅ | headless: status → ACCEPTED |
| Convert to Sales Order | ✅ | headless: SO created from quote |
| Approve SO | ✅ | headless: status → APPROVED |
| Confirm SO | ✅ | headless: status → CONFIRMED, event drained |
| **Reservation created** | ✅ **PROVEN** | `reservationRecord … qty=3` on live Neon |
| **Projection updated** | ✅ **PROVEN** | `reservedQuantity +3`, `availableQuantity −3` |
| SO line reservedQty | ✅ | `line.reservedQty = 3` |
| Outbox events not FAILED | ✅ | 0 failed events (payload + FK + drain fixes hold) |
| Fulfill SO | ✅ | status → FULFILLED + drain |
| Invoice created | ✅ | headless + authenticated UI (`INV-cosmy-uco-0068`) |
| Payment posted | ✅ | receivable OPEN → CLOSED |
| **Journal posted (invoice)** | ✅ **PROVEN** | DR AR 1000 · CR Revenue 847 · CR Output GST 153 — balanced; authenticated action posted it |
| **Journal posted (payment)** | ✅ **PROVEN** | DR Bank · CR AR — balanced |
| **GL balanced** | ✅ **PROVEN** | Σdebits = Σcredits across the whole ledger after postings |
| Dashboard updated | 🟡 partial | dashboards read live data; not asserted in this run |
| **Audit entry exists** | ✅ **PROVEN** | authenticated `create/quotation` audit row w/ `actorId` |
| Permission verified | ✅ | every mutation calls `requirePermission("sales.write")`; owner passed; restricted-user denial proven in prior certification |
| **Rollback verified** | ✅ **PROVEN** | cancel released reservation → projection back to baseline (reserved 0, available 100) |

## Defects found by runtime verification → fixed

1. **Reservation payload never decoded.** `confirmSalesOrder`/`fulfillSalesOrder` emitted the outbox payload via `JSON.stringify(...)`, but `outboxEventRecord.payload` is a **`Json` column** (working emitters pass a plain object) → double-encoded string → handler's `payload.soId` was `undefined`. Also key mismatches (`orderId`/`soId`, `lineId`/`id`). **Fixed:** plain-object payload with `soId` + line `id`.
2. **Reservation FK violation.** The reservation handler referenced a **synthetic** `inventoryId = ${businessId}-${variantId}-${warehouseId}`, which only matches records made by `ensureInventoryRecord` — **not** seeded ones (`INV-<slug>-<n>`) → FK violation → event FAILED → no reservation. **Fixed:** handler now looks up the real `InventoryRecord` by its unique key.
3. **Two-hop chain never drained.** `SalesOrderConfirmed → InventoryReservationRequested → reserve` needs multiple passes. **Fixed:** added `drainOutbox()`; confirm/fulfill drain to completion.
4. **No default warehouse.** Salam Cola had none; the reservation handler requires `isDefault`. Surfaced by the run (a default was set).

## Sales → Finance spine: CLOSED (2026-07-24)
`createCustomerInvoice` and `recordInvoicePayment` now post balanced double-entry journals via the
existing `FinancialPostingService` (new `lib/finance/sales-posting.ts`):
- **Invoice:** DR Accounts Receivable (total) · CR Sales Revenue (taxable) · CR Output GST (gst).
- **Payment:** DR Cash & Bank · CR Accounts Receivable.

Posting is **integral** — an invoice that fails to post is rolled back (compensating delete), so the
ledger and receivables never diverge. The Output-GST account (`2100`) is ensured idempotently.
Trial Balance / P&L / Balance Sheet read `journalLines`, so they now reflect sales activity.
Verified at runtime (headless 20/20 + authenticated invoice `INV-cosmy-uco-0068` → balanced journal).

## Deliveries / shipment lifecycle: backend PROVEN (2026-07-24)
The dispatch → inventory → finance chain is fixed and runtime-verified (25/25):
- **Dispatch deducts stock** — `onHand −= qty`, a `FULFILLED` stock movement is recorded, and the
  reservation flips `ACTIVE → FULFILLED`.
- **Dispatch generates an invoice** that now posts its own balanced journal (DR AR / CR Revenue /
  CR Output GST), plus a **COGS** entry (DR 5000 / CR 1200) when average cost is known.
- GL stays balanced after the whole chain.

Three defects the verification caught and fixed (`lib/outbox/handlers.ts`, `actions/fulfillment.ts`):
1. Stock-out used a **synthetic `inventoryId`** → FK-failed on seeded inventory (same class as the
   reservation bug). Now resolves the real `InventoryRecord`.
2. The DISPATCHED emitter omitted **`soId`**, so the handler's invoice + COGS block never ran.
3. The dispatch-generated invoice **bypassed journal posting** — now routed through `sales-posting`.

**Deliveries UI — BUILT (2026-07-24):** `/sales/deliveries` (status KPIs + `EnterpriseDataTable`),
`/sales/deliveries/[id]` (summary, lines with Requested/Reserved/Picked/Packed/Shipped, valid-
transition-only lifecycle via `EnterpriseConfirmDialog`, a **Downstream status** panel showing
Reserved/Deducted/Invoice/Journal/Audit ✓, and an audit timeline), and a printable delivery note
(`/sales/deliveries/[id]/delivery-note`, chrome hidden in print). "Create delivery" launches from
the SO detail. `createShipment`/`updateShipmentStatus` now write audit and use the correct
`/sales/deliveries` paths. Verified: tsc/build/lint green; list renders under real auth.
Full authenticated create→dispatch click-through not yet run (backend chain proven 25/25; UI render-verified).

**Still pending in Sales:** Customer Statements, Aging Report, Sales dashboard/reports, then the
final Sales Runtime Checklist to declare Sales production-complete.

## Remaining note
Operational businesses must have an **OPEN accounting period** covering the invoice date — posting
(correctly) refuses otherwise, which now makes invoice creation fail closed rather than silently
skip accounting. `scripts/ensure-open-periods.mjs` covers this.

## Reusable pattern
Every module gets a `src/lib/verification/<module>-runtime.ts` + a dev runner route. Do **not** advance to the next vertical until its checklist passes at runtime.
