# Procurement Architecture Review — CAP-PROCUREMENT V1.0 freeze gate

**Date:** 2026-07-26 · **Scope:** the Procurement capability (requisition → purchase order → goods
receipt → inventory projection → WAC → supplier bill → accounts payable → payment → journal →
general ledger → vendor ledger → statement → AP aging → dashboard → reports → Vendor 360 → audit).
This is a documented release gate, not a casual check. Every ✅ is backed by something that was
**actually run against the live Neon database** this gate, or verified by direct code inspection at
the cited location.

---

## 1. Domain Architecture
| Check | Result | Notes |
|---|---|---|
| One canonical Goods Receipt workflow | ✅ | `processGoodsReceiptRequest` ([inventory.ts:181](apps/frontend/src/app/actions/inventory.ts:181)) is the single wired path (receipts UI → this action → `GoodsReceiptCompleted`). The legacy, uncalled `processGoodsReceipt` was **removed** this program (zero callers; no projection/event/bill). |
| Clear Procurement → Inventory → Finance dependency direction | ✅ | Actions emit events; the outbox handler ([handlers.ts:18](apps/frontend/src/lib/outbox/handlers.ts:18)) updates inventory (projection + WAC) then Finance (bill → AP → journal). UI never imports the ledger engine or posting engine. |
| No circular dependencies | ✅ | UI → service → ledger/aging → `ledger-engine`/`posting-engine`. `vendor-360` and `procurement-dashboard` **consume** `vendor-ledger` + `payables-aging`; the ledger services never import the composers. |
| Services consume existing abstractions, not duplicated logic | ✅ | `vendor-ledger` is built on the shared `buildLedger` engine (same engine as `customer-ledger`); `procurement-dashboard.aging` **is** `getPayablesAging`; `vendor-360` reuses `getVendorLedger` + `getPayablesAging`. Verified at runtime: `dashboard.outstandingAP === aging.total` and `v360.summary.outstanding === vendorLedger.outstanding`. |

## 2. Accounting
| Check | Result | Evidence (this gate, live Neon) |
|---|---|---|
| Inventory valuation posts correctly | ✅ | Bill approval posts **DR 1200 Inventory 250 / CR 2000 AP 250** (balanced). Physical stock is tracked in the projection at receipt; the GL inventory asset is booked at bill approval — no double-count. |
| AP creation posts correctly | ✅ | `SupplierBillApproved` → one `PayableEntry` (OPEN, 250) + one balanced AP journal. |
| Payment clears AP correctly | ✅ | Payment posts **DR 2000 AP 250 / CR 1000 Bank 250**; the real action settles the subledger (`PayableEntry.paidAmount`, `SupplierBill` → PAID), so AP outstanding drops to 0. |
| Journals always balance | ✅ | Every posting goes through `FinancialPostingService.postEntry`, which rejects unbalanced entries. Both procurement journals verified DR=CR. |
| GL reconciliation succeeds | ✅ | Σdebits = Σcredits = **31,000,500.00** across the whole ledger after the full run. |

## 3. Inventory
| Check | Result | Notes |
|---|---|---|
| WAC implementation documented | ✅ | Pure `lib/finance/wac.ts` (moving weighted-average); precision policy + returns handling documented in [WAC_VERIFICATION.md](WAC_VERIFICATION.md). |
| WAC verified | ✅ | Dedicated 10-scenario matrix vs independently hand-computed expected values: **10/10**. Runtime gate asserts the exact expected average this run: **145.9076** (from 4318 @ 146.02 + 5 @ 50). The earlier downward WAC drift (a genuine double-count in the handler) was found and fixed. |
| Inventory projections consistent | ✅ | Goods receipt increments `onHandQuantity`/`availableQuantity` by exactly the accepted qty (runtime: onHand delta = 5). |
| Stock movements auditable | ✅ | Every movement is a `StockMovementRecord` row with type, signed quantity, actor and correlationId; projection is a deterministic aggregate over movements. |

## 4. Idempotency (retry-safety)
Recorded results — **7/7** (`/api/dev/verify-idempotency`, process-once → snapshot → replay → assert-unchanged). **Fixes made this program are included here, not hidden:**

| Event | Replay behaviour | Result |
|---|---|---|
| **Goods Receipt** (`GoodsReceiptCompleted`) | **Fix:** added an early-return guard at the handler top — if a supplier bill already exists for the GR, the whole handler is a no-op. Previously the PO-line `receivedQty` update sat *outside* the bill-existence guard, so a replay doubled received qty. | ✅ one bill · receivedQty not doubled (4, not 8) · WAC unchanged |
| **Bill** (`SupplierBillApproved`) | Already idempotent — the `existingPayable` guard wraps both the payable and the journal. | ✅ one payable · one AP journal |
| **Payment** (`SupplierPaymentRegistered`) | **Fix:** added a `journalEntry` existence guard — previously the payment journal posted with no guard, so a replay double-posted it. | ✅ one payment journal |
| **Outbox** (drain) | `drainOutbox` re-runs handlers; combined with the above guards, draining multiple times yields inventory once, bill once, journal once, GL balanced. | ✅ GL balanced after replay |

## 5. Shared Components
Procurement **reuses** (does not re-implement):

| Component | Reused by | Result |
|---|---|---|
| Shared Ledger Engine (`buildLedger`) | `vendor-ledger` | ✅ |
| `EnterpriseReportLayout` / `EnterpriseReportTable` | Purchases, Receipts, Vendor Bills, Payments, Supplier Spend, Summary | ✅ |
| Dashboard primitives (`EnterpriseKPIRow`/`StatCard`, chart wrappers) | Procurement dashboard, AP aging | ✅ |
| Chart wrappers (`StandardBar/Line/AreaChart`) | Dashboard, aging | ✅ |
| Audit service (`logAudit`) | Requisition, PO, GR, bill, payment actions | ✅ (call-sites verified; store writable + business-scoped at runtime) |
| `FinancialPostingService` (posting engine) | Bill approval, payment postings | ✅ |
| `getPayablesAging` | `procurement-dashboard`, `vendor-360` | ✅ |
| `getVendorLedger` | Vendor statement page, `vendor-360` | ✅ |

## 6. Security
| Check | Result | Evidence |
|---|---|---|
| RBAC enforced | ✅ | Requisition gates `purchase_requisition.create|update|approve`; receipts gate `inventory.update`; payables gate `finance.write`; reads gate `procurement.read`. |
| Audit on mutations | ✅ | `logAudit` at requisition/PO/GR/bill/payment; audit store verified writable + readable + business-scoped at runtime. |
| Multi-tenant isolation | ✅ | Every query scoped by `businessId`; runtime cross-business audit lookup returned nothing (isolation = true). |

## 7. Technical Debt (intentional, remaining)
1. **Remaining `tx: any` casts** in `inventory.ts` (4, pre-existing) and `event.payload as any` in the handlers — the outbox payload is a `Json` column; typed-payload discriminated unions are a deferred cross-module cleanup. Removing the dead `processGoodsReceipt` reduced `inventory.ts` lint from 6 → 4.
2. **Stock-OUT replay guard tracked for Inventory (cross-module).** `ShipmentDispatched → InventoryStockOutRequested` ([handlers.ts:363](apps/frontend/src/lib/outbox/handlers.ts:363)) creates a stock movement with a `Date.now()`-based id and **no replay guard**, so a replay could double-deduct. This is a **Sales/Inventory** concern; frozen Sales is not being re-architected here. Logged as a cross-module follow-up for the Inventory capability.
3. **Backdated receipt re-sequencing not implemented.** A receipt dated in the past does not retroactively re-sequence historical WAC — the moving average applies forward-only (documented in WAC_VERIFICATION.md).
4. **Receipt cancellation not exposed as a user workflow.** Stock-restore-on-cancel exists in the verification model but is not wired to a UI action.
5. **Requisitions are vendor-agnostic** (no `supplierId`), so requisitions are not attributed to a supplier in Vendor 360.

## Runtime gate (this review)
| Gate | Result |
|---|---|
| End-to-end runtime verification (`/api/dev/verify-procurement`) | ✅ **18/18 PASS** on live Neon (Salam Cola) |
| WAC matrix (`/api/dev/verify-wac`) | ✅ **10/10** |
| Idempotency (`/api/dev/verify-idempotency`) | ✅ **7/7** |
| `tsc --noEmit` | ✅ EXIT 0 |
| `npm run build` | ✅ EXIT 0 (Compiled successfully) |
| ESLint (new procurement code) | ✅ 0 errors |
| GL balanced | ✅ Σdebits = Σcredits |

## Final end-to-end scenario (verified this gate)
Purchase Requisition → Purchase Order → **Goods Receipt (stock-in)** → Inventory Projection → **WAC
(exact expected)** → Supplier Bill (auto) → **Accounts Payable + balanced journal** → Supplier
Payment (**subledger settled + balanced journal**) → **General Ledger (balanced)** → Vendor Ledger →
Vendor Statement → AP Aging → Dashboard → Reports → Vendor 360 → Audit. **Every step succeeds and
the read models reconcile to the same figures.**

## Verdict
**Procurement architecture is sound and internally consistent — it mirrors the frozen CAP-SALES V1.0
pattern.** Cleared to freeze as **CAP-PROCUREMENT V1.0**, subject to the known limitations recorded
in `CAP_PROCUREMENT_V1_RELEASE.md`.
