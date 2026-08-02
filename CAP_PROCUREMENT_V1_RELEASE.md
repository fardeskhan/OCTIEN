# CAP-PROCUREMENT V1.0 — Release Notes

**Module:** OCTIEN Procurement · **Status:** ✅ **PRODUCTION READY (frozen)**
**Date:** 2026-07-26 · **Verified against:** live Neon PostgreSQL (Salam Cola)

CAP-PROCUREMENT V1.0 is the **second production-complete transactional domain** in OCTIEN, built to
the same architecture, workflows, reporting, verification and documentation discipline as the frozen
reference module **CAP-SALES V1.0**. It should now receive only bug fixes and intentional
enhancements — not architectural changes.

## Overview
A complete procure-to-pay capability: raise a requisition, place a purchase order, receive goods
(moving stock and blending weighted-average cost), auto-generate the supplier bill, book accounts
payable with balanced double-entry accounting, pay the supplier and settle the subledger — with
every step surfacing in the vendor ledger, statements, AP aging, dashboard and reports, unified in a
single Vendor 360 view.

## Architecture
- **Domain services own the logic** (`lib/finance/vendor-ledger`, `lib/finance/payables-aging`,
  `lib/finance/posting-engine`, `lib/finance/wac`, `lib/procurement/*`).
- **One canonical goods-receipt workflow** — `processGoodsReceiptRequest` → `GoodsReceiptCompleted`;
  the legacy uncalled implementation was removed.
- **Event-driven side effects** via the outbox (`GoodsReceiptCompleted → bill + WAC`,
  `SupplierBillApproved → AP + journal`, `SupplierPaymentRegistered → payment journal`), drained
  synchronously with `drainOutbox()`, **idempotent on replay**.
- **Shared ledger engine** — `vendor-ledger` is built on `buildLedger`, the same engine as
  `customer-ledger`, and reconciles against the `PayableEntry` subledger.
- **One design system** (`components/enterprise/*`) including the config-driven reporting framework.
- **Runtime verification harnesses** (`lib/verification/procurement-runtime.ts`, `wac-runtime.ts`,
  `idempotency-runtime.ts` + `/api/dev/verify-*`).

## Transaction flow
Purchase Requisition → Purchase Order → Goods Receipt → Inventory Projection → WAC → Supplier Bill →
Accounts Payable → Supplier Payment → Journal → General Ledger → Vendor Ledger → Vendor Statement →
AP Aging → Dashboard → Reports → Vendor 360 → Audit.

## Accounting flow
- **Goods receipt** — increments the inventory projection (quantity) and blends the moving
  weighted-average cost. Physical stock is tracked here; the GL inventory asset is booked at bill
  approval (no double-count).
- **Bill approved** — DR 1200 Inventory / CR 2000 Accounts Payable; creates the `PayableEntry` (OPEN).
- **Supplier payment** — DR 2000 Accounts Payable / CR 1000 Cash & Bank; settles the subledger
  (`PayableEntry.paidAmount` → PAID, `SupplierBill` → PAID), so AP outstanding falls to zero.
- Posting is integral — `FinancialPostingService.postEntry` rejects any unbalanced entry.

## Inventory valuation
- Moving **weighted-average cost** (`lib/finance/wac.ts`), blended across the variant's warehouse
  projections on each receipt. Precision policy and returns handling: [WAC_VERIFICATION.md](WAC_VERIFICATION.md).
- Independently verified against a 10-scenario hand-computed matrix (**10/10**) and asserted exact in
  the end-to-end runtime.

## Reporting
- **Purchase Register**, **Goods Receipt Register**, **Vendor Bill Register**, **Vendor Payment
  Register**, **Supplier Spend**, and a **Procurement Summary** — all on `EnterpriseReportTable`,
  CSV + Print. No report recomputes a figure a domain service already owns.

## Dashboard
- Executive KPIs (spend, POs, receipts, bills, payments, outstanding/overdue AP, avg payment days),
  purchase/bill/paid trends, AP aging (reused from `getPayablesAging`), operations counters, top
  suppliers, largest outstanding, recent purchases, and alerts.

## Vendor 360
- Master + credit + summary + activity (PO/GR/bill/payment counts) + recent ledger + aging snapshot +
  open POs + pending receipts + bills awaiting approval + top products + a unified chronological
  **timeline** — a pure composition over `getVendorLedger` + `getPayablesAging` + registers.

## Security · Permissions · Audit
- RBAC: reads `procurement.read`; writes `purchase_requisition.*`, `inventory.update`,
  `finance.write`; Owner super-admin.
- Every mutation is audited (`logAudit`); the audit store is business-scoped.
- Multi-tenant: all queries scoped by `businessId` (cross-business isolation verified at runtime).

## Verification results (consolidated)
| Verification | Result |
|---|---|
| End-to-end runtime (`/api/dev/verify-procurement`) | ✅ **18/18** |
| WAC matrix (`/api/dev/verify-wac`) | ✅ **10/10** |
| Idempotency (`/api/dev/verify-idempotency`) | ✅ **7/7** |
| `npm run build` | ✅ EXIT 0 |
| `tsc --noEmit` | ✅ EXIT 0 |
| ESLint (new procurement code) | ✅ 0 errors |
| GL balanced (Σdebits = Σcredits) | ✅ 31,000,500.00 = 31,000,500.00 |

All run against live Neon (Salam Cola). Full detail: [PROCUREMENT_ARCHITECTURE_REVIEW.md](PROCUREMENT_ARCHITECTURE_REVIEW.md).

## Known limitations (explicit, not hidden)
1. **Backdated receipts are not retroactively re-sequenced.** A receipt dated in the past does not
   rewrite historical WAC; the moving average applies forward-only.
2. **Receipt cancellation is not exposed as a user workflow.** Stock-restore-on-cancel exists in the
   verification model but is not wired to a UI action.
3. **Report exports are CSV + Print only.** Native PDF / XLSX export requires additional libraries.
4. **Requisitions are vendor-agnostic** (`PurchaseRequisition` has no `supplierId`), so requisitions
   are not attributed to a supplier in Vendor 360.
5. **Background-job runner still absent** — the outbox is drained synchronously per action; the
   Operations Center that would surface failed events is designed but not built.

## Cross-module follow-up (not a Procurement defect)
- **Stock-OUT replay guard (Inventory).** ✅ **RESOLVED 2026-07-26** during the Inventory backend
  verification pass. `ShipmentDispatched → InventoryStockOutRequested`
  ([handlers.ts:363](apps/frontend/src/lib/outbox/handlers.ts:363)) previously created a stock
  movement with a `Date.now()`-based id and no replay guard, so a replay double-deducted stock. Fixed
  with an early-return guard keyed off the deterministic per-shipment `correlationId`
  (`SHP-<shipmentId>`); a replay is now a no-op. Proven by `/api/dev/verify-inventory` (12/12,
  including the stock-OUT replay scenario) with Sales re-verified 25/25 (no regression). A sibling
  reservation-replay gap (`InventoryReservationRequested`) was found and fixed the same way.
  Procurement's own stock-IN, bill, AP, payment and journal paths remain replay-guarded (idempotency
  7/7).

## Future enhancements
- Typed event payloads (retire `payload as any` / `tx: any` across handlers).
- Receipt cancellation user workflow; requisition-to-PO supplier attribution.
- PDF/XLSX exports + saved report presets.
- Operations Center (workflow monitor, outbox queue, DLQ replay, audit explorer).

## Release status
**CAP-PROCUREMENT V1.0 — PRODUCTION READY.** Frozen. OCTIEN now has **two** fully verified
transactional domains — Sales and Procurement — on the same enterprise architecture.
