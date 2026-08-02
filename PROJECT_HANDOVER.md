# OCTIEN ERP — Definitive Engineering Handover

> **Audience:** the next engineer (or Claude instance) taking ownership of this project on a fresh account with **no prior memory**. This document is self-contained: it assumes you have the repository and nothing else. It is written to let you resume development at the exact current stage without asking questions.
>
> **Author's stance:** Principal-architect handover. I distinguish **FACT** (verified against the codebase/live DB this session) from **RECOMMENDATION** (my engineering judgment). Frozen capabilities are to be respected — bug-fix only, no re-architecture.
>
> **Date of handover:** 2026-07-26. **Repo root:** `D:\cosmyerp\COSMY-BOS`.

---

## 1. Executive Overview

**What this is (FACT).** OCTIEN is a **multi-tenant, multi-business ERP** — branded *OCTIEN by Aeterex* (formerly "COSMY ERP"; see `apps/frontend/src/lib/branding.ts`). It runs several businesses under one tenant/platform: **Salam Cola** (beverage manufacturing/distribution — the primary demo business with the richest seed data), **COSMY UCO**, and **Casa de Lumas**. The product spans the classic ERP verticals: Sales (order-to-cash), Procurement (procure-to-pay), Inventory (stock + valuation), and Finance (accounting/ledger/tax/assets), plus Logistics, CRM, Governance, and Compliance (GST/E-Invoice/E-Way Bill for the Indian market).

**Vision (FACT, from program history).** Build the ERP to genuine production quality **one production-complete vertical at a time**, each verified at runtime against a live database before it is "frozen" as a reference implementation. The north star is SAP/Oracle-class correctness for the core transactional spine (Sales → Inventory → Finance) with honest, documented limitations rather than demo-ware.

**Target users (FACT/inferred).** SMB-to-mid-market manufacturers/distributors operating multiple business units under one corporate tenant, in a GST jurisdiction (India). Roles are RBAC-gated (Owner super-admin, Sales, Finance, etc.).

**Business model (inferred).** Multi-tenant SaaS ERP; the "Powered by Aeterex" watermark and central branding suggest a white-labelable platform play.

**Overall architecture (FACT).** Next.js 16 App Router frontend that *is* the application: React Server Components + server actions call domain services in `apps/frontend/src/lib/*`, which post to a double-entry accounting engine and read/write Prisma models on Neon Postgres. Side effects are event-driven through a transactional **outbox** drained synchronously per action. A parallel, **not-yet-wired** DDD backend exists under `packages/domain` + `apps/backend` (see §2, §15).

**Current maturity (FACT).**
- **Sales** — ✅ *Frozen* (CAP-SALES V1.0), the canonical reference module.
- **Procurement** — ✅ *Frozen* (CAP-PROCUREMENT V1.0).
- **Inventory** — ▶️ *In progress.* Backend verified (2 real replay bugs found & fixed); reservation + picking scenario expansion **written and typechecking, not yet run** (the resume point).
- **Finance** — 🟡 Large service library (`lib/finance`, ~30 services) but **thin/mock UI**, not verified end-to-end.
- **Everything else** (Logistics, CRM, HR, Governance sub-apps) — mixed; 42 of 150 pages still import mock `_data/`.

---

## 2. Architecture Analysis

### 2.1 The two architectures (READ THIS FIRST — FACT)

The repository contains **two distinct architectures**. Confusing them is the single biggest onboarding hazard.

1. **The ACTIVE, frontend-centric architecture** (where *all* verified and frozen work lives). Everything runs inside the Next.js app (`apps/frontend`):
   - **Write path:** UI (client form) → **server action** (`src/app/actions/*.ts`, `"use server"`) → **domain service** (`src/lib/*`) → **posting/ledger engine** (`src/lib/finance/*`) → **Prisma** → **Neon Postgres**.
   - **Side effects:** the action writes an **`outboxEventRecord`** row in the same transaction, then calls `processOutboxBatch()` / `drainOutbox()` which runs registered handlers (`src/lib/outbox/handlers.ts`) **synchronously**.
   - **Read path:** server components call read-model services (`lib/finance/*-ledger`, `*-aging`, `lib/sales/*`, `lib/procurement/*`) that query Prisma (including denormalized projection tables).
   - **Verified against live Neon** via `src/lib/verification/*-runtime.ts` + `/api/dev/verify-*` routes.

2. **The PARALLEL DDD architecture** (NOT wired into the active app — treat as aspirational/legacy). Under `packages/domain/src/{banking,crm,documents,finance,identity,inventory,ops,purchasing,sales,shared}` (bounded-context domain model with tests) and `apps/backend/src/main-{api,worker,scheduler,projection,ai}.ts` (a real multi-process backend: API, background worker, scheduler, projection builder, AI gateway). **FACT:** `apps/frontend` imports **none** of these (`grep` of frontend imports shows only `@prisma/*`, `@tanstack/*`, `@base-ui/*`, `@hookform/*`, `@neondatabase/*`). The frozen capabilities do **not** depend on it.

> **RECOMMENDATION:** Do not try to unify these now. Continue delivering verticals on the active frontend architecture. Treat `packages/domain` + `apps/backend` as a future migration target (§15, §23), not a dependency.

### 2.2 Frontend (FACT)
Next.js **16.2.9** (App Router, Turbopack), **React 19**, **TypeScript strict**. Route groups under `src/app/(dashboard)/`: `sales`, `procurement`, `inventory`, `finance`, `reports`, `governance`, `operations`, `business`, plus per-business sub-apps `salam-cola`, `uco`, `lumas`. `params` is a Promise (await it) — this Next version has breaking changes; **read `node_modules/next/dist/docs/` before writing framework code** (per `apps/frontend/AGENTS.md`).

### 2.3 Backend / runtime (FACT)
There is no separate running backend for the active app — the Next.js server *is* the backend. `apps/backend` (Nest-style multi-entry) exists but is not the deployment target of the verified capabilities. The outbox is drained **synchronously** in-process; there is **no background job runner** in the active path (a documented limitation across all modules).

### 2.4 Database (FACT)
**Prisma 6.19.3** with the **Neon serverless adapter** (`@prisma/adapter-neon`, `ws`). The **active schema** is `packages/database/prisma/schema.prisma` (**2371 lines**, ~110 models) — this is what `prisma generate --schema=…/schema.prisma` builds (see `apps/frontend/package.json`). Two other `.prisma` files exist — `finance.prisma` ("CAP-FINANCE LITE V1", 176 lines) and `logistics.prisma` (114 lines) — which **duplicate** several model/enum names; **FACT/inferred:** these are **legacy/alternate** definitions not compiled into the active client. Ignore them unless doing schema archaeology.

### 2.5 Event-driven architecture (FACT)
- `OutboxEventRecord` (PK `eventId`, `status` PENDING/COMPLETED/FAILED, **`payload` is a `Json` column** — pass **plain objects**, never `JSON.stringify`).
- `src/lib/outbox/processor.ts`: `processOutboxBatch()` (drains PENDING once), `drainOutbox(maxPasses)` (loops for multi-hop chains).
- `src/lib/outbox/registry.ts` + `handlers.ts`: `registerHandler(eventType, fn)`.
- **Event chains (active):** `SalesOrderConfirmed → InventoryReservationRequested → (reserve)`; `ShipmentDispatched → InventoryStockOutRequested (+ COGS + invoice) → InventoryStockOutCompleted`; `GoodsReceiptCompleted → (bill + WAC) → SupplierBillCreated`; `SupplierBillApproved → (AP + journal)`; `SupplierPaymentRegistered → (journal)`; `CustomerInvoiceCreated → (AR + journal)`; `CustomerPaymentRecorded → (journal)`.
- **Idempotency is enforced by handler guards** (existence checks by `sourceType`+`sourceId`, correlationId, or subledger row). This is the module's most safety-critical property (see §8).

### 2.6 Services, dependency direction (FACT)
Strict, verified direction: **UI → service → ledger/aging → ledger-engine/posting-engine**. UI never imports the ledger/posting engine. Composers (`vendor-360`, `procurement-dashboard`, `sales-dashboard`, `customer-360`) **consume** ledger/aging services; ledger/aging services never import composers. No circular dependencies (verified in both architecture reviews).

### 2.7 Accounting engine (FACT)
`lib/finance/posting-engine.ts` → `FinancialPostingService.postEntry({businessId, tenantId, description, sourceType, sourceId, lines:[{accountCode, debit?, credit?}]})`. It **rejects unbalanced entries** (Σdebit ≠ Σcredit) and **requires an open `AccountingPeriod`** covering the date (else it throws — postings fail *closed*). Chart of accounts (by `accountCode`): **1000** Cash & Bank, **1100** Accounts Receivable, **1200** Inventory Asset, **2000** Accounts Payable, **2100** Output GST, **4000** Sales Revenue, **5000** COGS. `lib/finance/sales-posting.ts` provides `ensureSalesLedgerAccounts` (idempotent; ensures 2100 which wasn't seeded), `postCustomerInvoiceJournal` (DR 1100 / CR 4000 / CR 2100), `postCustomerPaymentJournal` (DR 1000 / CR 1100), `splitInclusiveGst` (18% inclusive).

### 2.8 Ledger engine (FACT)
`lib/finance/ledger-engine.ts` → `buildLedger<T>(entries)` returns `{lines(with runningBalance), totalDebit, totalCredit, balance}` (chronological sort, running balance = Σdebit − Σcredit). Consumed by **both** `customer-ledger.ts` (AR) and `vendor-ledger.ts` (AP). **Single source of truth for settled amounts** is the subledger (`ReceivableEntry`/`PayableEntry.paidAmount`); ledgers add a reconciling "Payments applied" line when payment rows and subledger diverge, so ledger outstanding == aging == statement.

### 2.9 Reporting & dashboard frameworks (FACT)
- **Enterprise kit** `src/components/enterprise/*` (foldered: `data/`, `feedback/`, `forms/`, `layout/`, `security/`): `EnterpriseReportLayout` + `EnterpriseReportTable` (config-driven columns `{key, header, format: text|money|number|status}`), `EnterpriseDataTable`, `EnterpriseStatusBadge` (config-driven status→variant map), `EnterpriseKPIRow/StatCard`, `EnterprisePage/PageHeader/Section`, `EnterprisePrintButton`, `EnterpriseConfirmDialog`, `EnterpriseEmptyState`, `EnterpriseImportDialog`, `EnterprisePermissionGuard` (client UX only — server `requirePermission` is the real gate).
- **Chart wrappers** `src/components/ui/chart-wrappers`: `StandardBarChart/LineChart/AreaChart` (`{data, xAxisKey, series:[{key,color}]}`).
- **Dashboards** are thin orchestration DTOs that **reuse** aging/ledger services (no recomputation).

### 2.10 Runtime verification framework (FACT — the project's signature practice)
`src/lib/verification/*-runtime.ts` + dev-only routes `src/app/api/dev/verify-*` (guarded `NODE_ENV !== 'production'`, excluded from middleware). Each harness seeds throwaway data, exercises the **real** services/handlers against **live Neon**, asserts DB outcomes, and **cleans up in `finally`**. This practice has found production bugs in every module (§8). See §17 for the emerging shared `inventory-invariants.ts` kit.

**Why the architecture exists (RECOMMENDATION/analysis):** the team deliberately optimized for *provable correctness of money and stock* over feature breadth. Double-entry posting is integral (rolls back if it can't post), the outbox makes side effects explicit and replayable, subledgers are the single source of truth, and runtime harnesses prove it against real data. That is why Sales and Procurement can be credibly "frozen."

---

## 3. Capability Map

Legend: Backend %/Frontend %/Verification % are my calibrated estimates (RECOMMENDATION) from the code; status/frozen are FACT.

| Capability | Status | Arch maturity | Backend | Frontend | Verification | Release | Frozen | Key debt / limitations |
|---|---|---|---|---|---|---|---|---|
| **Sales** | Frozen | High | 95% | 90% | ✅ 25/25 | CAP-SALES V1.0 | ✅ | No `Customer.creditLimit`; no CreditNote; CSV/Print only; outbox synchronous |
| **Procurement** | Frozen | High | 95% | 90% | ✅ 18/18 (+WAC 10/10, idemp 7/7) | CAP-PROCUREMENT V1.0 | ✅ | Requisitions vendor-agnostic; backdated receipts no retro re-sequence; receipt cancel not UI-wired |
| **Inventory** | **Frozen** | High | 90% | 90% | ✅ 78/78 | CAP-INVENTORY V1.0 | ✅ | Projection is a denormalized cache not rebuildable from ledger; no reorder-point model (low-stock heuristic); no expiry sweeper; picking = ShipmentLine markers |
| **Finance** | In dev | Med | 70% (service lib) | 25% (mock/shell) | 🟡 partial (via Sales/Proc GL checks) | — | ❌ | UI thin; assets/tax/budget services unverified end-to-end |
| **Logistics** | Partial | Med | 60% | 50% | ❌ | — | ❌ | Delivery runs partially built |
| **Governance/Audit** | Partial | Med | 70% | 60% | ⚠️ (audit store checked in harnesses) | — | ❌ | Ops Center designed, not built |
| **CRM / HR** | Greenfield | Low | 10% | 10% | ❌ | — | ❌ | HR/CRM essentially don't exist |
| **Compliance (GST/E-Invoice/E-Way)** | Partial | Med | 60% (models+services) | 40% | ❌ | — | ❌ | Not runtime-verified |

---

## 4. Detailed Progress (FACT — chronological milestones)

1. **Enterprise UI kit (Phase A).** Consolidated pre-existing scattered UI into `components/enterprise/*` (single import surface). Added the genuinely-missing pieces (StatusBadge, ConfirmDialog, PermissionGuard, EmptyState, ImportDialog, `lib/csv.ts`).
2. **Sales vertical, fully built and frozen:**
   - Quotations (create + lifecycle + convert-to-SO); Sales Orders (approve/confirm→reserve/fulfil/cancel→release, detail, audit timeline); Deliveries/Shipments (pick→pack→dispatch→deliver, downstream-status panel, printable delivery note).
   - Invoices & Payments post **balanced journals** (integral posting). Customer Ledger (canonical AR), Statements, AP/AR Aging, Sales Dashboard, Sales Reports (6 registers), Customer 360 (unified timeline).
   - **Bugs found & fixed by verification:** double-encoded outbox payload (`JSON.stringify` on a Json column), key mismatches (`orderId`/`lineId` vs `soId`/`id`), synthetic `inventoryId` FK-failing for seeded inventory (reservation + stock-out), missing default warehouse, dispatch payload missing `soId`, dispatch invoice bypassing journal posting.
   - Frozen: **CAP-SALES V1.0** (`SALES_ARCHITECTURE_REVIEW.md`, `CAP_SALES_V1_RELEASE.md`), runtime **25/25**.
3. **Shared ledger foundation extracted:** `ledger-engine.ts`; `customer-ledger` refactored onto it (no regression); `vendor-ledger` built as the AP mirror. **Ledger single-source-of-truth fix** (subledger reconciling line) applied to both.
4. **Procurement vertical, fully built and frozen:**
   - Vendor Ledger, Vendor Statements, AP Aging, Procurement Dashboard, Procurement Reports (5 registers + summary), Vendor 360.
   - **WAC verification workstream:** found & fixed a real **double-count** in the goods-receipt WAC handler; extracted pure `lib/finance/wac.ts`; 10-scenario matrix (`wac-runtime.ts`, `/verify-wac`) proving qty+WAC+value to 1e-6; documented in `WAC_VERIFICATION.md`.
   - **Duplicate protection / idempotency:** found & fixed unguarded `SupplierPaymentRegistered` and `GoodsReceiptCompleted` replays; proved via `idempotency-runtime.ts` (`/verify-idempotency`) **7/7**. Removed dead legacy `processGoodsReceipt` (only `processGoodsReceiptRequest` is wired).
   - Full release-gate runtime expanded to **18/18** (PR→PO→GR→projection→WAC→bill→AP→payment→journal→GL→vendor-ledger→statement→aging→dashboard→reports→360→audit), all read models reconciling.
   - Frozen: **CAP-PROCUREMENT V1.0** (`PROCUREMENT_ARCHITECTURE_REVIEW.md`, `CAP_PROCUREMENT_V1_RELEASE.md`).
5. **Inventory backend verification (current vertical):**
   - Mapped the transaction graph; built `inventory-runtime.ts` + `/verify-inventory`; proved the movement→projection identity and reservation/dispatch flow.
   - **Found & fixed two real replay bugs:** (a) **Priority #1 stock-OUT replay** (`InventoryStockOutRequested` created a `Date.now()`-id movement + decremented onHand with no guard → replay double-deducted) — fixed with a `correlationId=SHP-<shipmentId>` early-return guard; (b) **reservation replay** (`InventoryReservationRequested` duplicated reservations) — fixed with an ACTIVE/FULFILLED existence guard.
   - **Found & fixed a framework-wide harness bug:** all runtimes' `finally` re-resolved the business via nondeterministic `db.business.findFirst()`, so projection/WAC restore silently no-op'd → each run leaked `onHand` / failed to restore `averageCost`, and leaked orphaned projections that polluted the variant's cross-warehouse WAC blend (real avgCost drifted 146.02→143.70). Fixed by capturing `resolvedBusinessId` once and reusing it in `finally` across **sales/procurement/inventory/idempotency** runtimes; idempotency-runtime now restores `onHand` too; inventory-runtime self-heals stray `WH-INVVER` warehouses. Built `/api/dev/inspect-variant` to detect/purge orphans and restore WAC/onHand; restored the true baseline (MAIN 4200 + DISTRIBUTOR 122 = 4322 @ WAC 146.0186). **All harnesses are now non-mutating.**
   - Regression-verified after handler edits: **Sales 25/25, Procurement 18/18, WAC 10/10, Idempotency 7/7, Inventory 12/12**, build & typecheck clean.

---

## 5. Release Status

| Capability | State |
|---|---|
| Sales | **Frozen** (production-ready reference) |
| Procurement | **Frozen** (production-ready) |
| Inventory | **Frozen** (CAP-INVENTORY V1.0 — runtime 78/78, UI complete) |
| Finance | **In Development** (service lib built; UI mock; unverified) |
| Logistics | **Experimental/Partial** |
| Governance/Audit | **In Development** |
| Compliance (GST/E-Invoice/E-Way) | **Experimental** (models/services exist; unverified) |
| CRM / HR | **Planning** (greenfield) |
| DDD backend (`packages/domain` + `apps/backend`) | **Experimental / not wired** |

---

## 6. Current Stage (FACT)

**Where the project is right now:** mid-way through **Inventory Phase-2 (domain-behaviour hardening)**, following the same "verify first, build second" lifecycle that froze Sales and Procurement.

**Actively being worked on:** expanding `inventory-runtime.ts` with the **full reservation lifecycle** (reserve, double/replay, cancel, re-reserve-after-cancel, expire, all-or-nothing) and the **picking lifecycle** (pick/partial-pick/unpick/pack/ship-prep must not move stock or change WAC; only stock-out does, and it is replay-safe), with the four permanent invariants extracted into a reusable kit (`inventory-invariants.ts`).

**Why:** to bring the Inventory *engine* to Sales/Procurement parity **before** investing in UI, because runtime verification keeps finding real bugs that build-clean/typecheck-clean do not.

**What comes immediately after:** run the expanded harness, fix anything it exposes, regression-sweep the frozen modules, then proceed down the Inventory lifecycle: Core Services (`lib/inventory/*`) → Dashboard → Reports → (optional Inventory 360) → Architecture Review → full Runtime gate → `CAP_INVENTORY_V1_RELEASE.md` → Freeze.

---

## 7. Current Sprint

**Sprint goal:** Inventory engine verified to parity → ready for Core Services.

**Objectives:** (a) reservation lifecycle scenarios; (b) picking lifecycle scenarios; (c) permanent invariants (projection identity as delta-tracking, availability, valuation, WAC boundary) embedded after every scenario; (d) keep all harnesses non-mutating; (e) refine reservation guard so re-reserve-after-cancel works.

**Completed this sprint (FACT):**
- Reservation guard refined to `status ∈ {ACTIVE, FULFILLED}` (allows re-reserve after CANCELLED/EXPIRED) — `handlers.ts` `InventoryReservationRequested`.
- `inventory-invariants.ts` created: `snapshotInventory`, `checkInvariants(base, cur, label)` (delta-tracking identity + availability + valuation), `checkWacUnchanged`.
- `inventory-runtime.ts` rewritten with Part A (isolated identity), Part B (reservation lifecycle), Part C (picking lifecycle + dispatch + stock-out replay); invariant calls converted to delta-based.
- **Typecheck: clean (EXIT 0) for both files.**

**Remaining work (the immediate next actions):**
1. **Run `/api/dev/verify-inventory`** and confirm all steps pass (the expanded harness has **not been executed yet** — see §25).
2. Fix anything the run exposes (the delta-invariant design was adopted precisely because absolute `onHand == Σmovements` fails on seeded projections — see §10).
3. Regression sweep: `/verify-sales` (25), `/verify-procurement` (18), `/verify-wac` (10), `/verify-idempotency` (7); confirm `/inspect-variant` baseline stays 4322 @ 146.0186 / 0 orphans.
4. `npm run build` + `tsc` + lint (new code).

**Exit criteria:** expanded Inventory harness green; frozen modules non-regressed; harnesses non-mutating; build/typecheck/lint clean.

---

## 8. Runtime Verification (FACT)

All harnesses live in `src/lib/verification/` with `/api/dev/verify-*` runners; they run the **real** code against **live Neon**, assert DB state, and self-clean.

| Harness | Route | Coverage | Bugs it found | Result |
|---|---|---|---|---|
| `sales-runtime.ts` | `/verify-sales` | quote→order→reserve→dispatch→stock-out→COGS→invoice→payment→journal→GL→ledger→aging→dashboard→360 | payload double-encoding, key mismatch, synthetic-FK reservation/stock-out, missing default WH, dispatch missing soId, dispatch invoice not posted | **25/25** |
| `procurement-runtime.ts` | `/verify-procurement` | PR→PO→GR→projection→WAC→bill→AP→payment→journal→GL→vendor-ledger→statement→aging→dashboard→reports→360→audit | GR payload missing poLineId/variantId; ledger/aging divergence; harness wrong-business restore | **18/18** |
| `wac-runtime.ts` | `/verify-wac` | 10-scenario WAC matrix (empty/higher/lower/partial/multiple/return/adjustment/consumption/backdated/cancelled) vs hand-computed | WAC double-count in GR handler | **10/10** |
| `idempotency-runtime.ts` | `/verify-idempotency` | GR/bill/payment **event replay** + GL balance | unguarded SupplierPaymentRegistered & GoodsReceiptCompleted replays; harness onHand leak | **7/7** |
| `inventory-runtime.ts` | `/verify-inventory` | Part A movement→projection identity; Part B reservation lifecycle; Part C picking + dispatch + stock-out replay | **stock-OUT replay double-deduct (Priority #1); reservation replay; framework-wide wrong-business restore; orphaned-projection WAC pollution** | **12/12** (pre-expansion); expansion **not yet run** |

Support routes: `/api/dev/inspect-variant` (list/purge orphaned projections; restore WAC/onHand), `/recent-journals`, `/recent-audit`, `/cleanup-verify`.

**Verification quality (RECOMMENDATION):** this is the strongest part of the project — genuinely enterprise-grade integration verification that has repeatedly caught money/stock-correctness bugs that unit tests and green builds would miss. **Remaining gaps:** (1) verification is dev-route-driven, not part of CI; (2) no automated assertion that harnesses are non-mutating (it was a manual discovery); (3) Finance's asset/tax/budget services are unverified; (4) the DDD backend has its own `apps/backend/test/inventory.e2e-spec.ts` untied to the active path.

---

## 9. Frozen Capabilities (FACT)

### CAP-SALES V1.0 (frozen 2026-07-24)
- **Docs:** `SALES_ARCHITECTURE_REVIEW.md`, `CAP_SALES_V1_RELEASE.md`.
- **Runtime:** 25/25 on live Neon; `tsc`/build clean; authenticated render smokes tie out.
- **Known limitations:** no `Customer.creditLimit` ("Available Credit: Not set"); no `CreditNote` model; CSV/Print exports only; no saved-filter presets; no territory/salesperson dims; **no background-job runner** (outbox drained synchronously).
- **Quality:** high. Canonical pattern for all other modules.

### CAP-PROCUREMENT V1.0 (frozen 2026-07-26)
- **Docs:** `PROCUREMENT_ARCHITECTURE_REVIEW.md`, `CAP_PROCUREMENT_V1_RELEASE.md`.
- **Runtime:** 18/18; WAC 10/10; idempotency 7/7; GL balanced; build/tsc clean; lint (new code) clean.
- **Known limitations:** backdated receipts not retro-resequenced (WAC forward-only); receipt cancellation not UI-wired; CSV/Print only; requisitions vendor-agnostic (no `supplierId`) → not attributed in Vendor 360; synchronous outbox. Cross-module stock-OUT replay item logged there is now **✅ resolved** in Inventory.
- **Quality:** high; mirrors Sales exactly.

> **Rule:** frozen modules receive **bug fixes only**, never re-architecture. The Inventory work legitimately edits `handlers.ts` (shared stock-out/reservation handlers on the Sales path) but each edit was regression-verified against `/verify-sales` (25/25).

---

## 10. Inventory Analysis (deep)

**Architecture (FACT).** Inventory is the **system of record for physical stock and valuation**; Sales and Procurement consume it. Core models: `InventoryRecord` (per business/variant/warehouse; unique key), `StockMovementRecord` (`type` is a free **String**: RECEIVED/FULFILLED/TRANSFERRED_OUT/ADJUSTED/RETURN; `quantityValue` signed Float; `correlationId`), `ReservationRecord` (`status` String: ACTIVE/FULFILLED/CANCELLED/EXPIRED; `expiresAt`), `InventoryVariantProjection` (read model: `onHandQuantity`, `reservedQuantity`, `availableQuantity`, `averageCost` Decimal). Actions in `app/actions/inventory.ts`: `adjustInventory`, `transferInventory`, `processGoodsReceiptRequest`, and the private `updateVariantProjection` (recomputes `onHand = Σ movements`, `reserved = Σ ACTIVE reservations`, `available = onHand − reserved`).

**Strengths.** Movement ledger is append-only and signed; the recompute path is self-healing; WAC is owned by Procurement's receipt handler and Inventory treats it as immutable input; reservation and stock-out are now replay-guarded.

**Weaknesses / key findings (FACT).**
1. **Two projection-maintenance strategies coexist:** `updateVariantProjection` **recomputes** from the ledger, while the outbox handlers mutate the projection **incrementally**. They were verified consistent, but this duality is a latent drift risk.
2. **The projection is a denormalized cache that is NOT reconstructable from the movement ledger for seeded/production data** (no opening-balance movements: seeded `onHand=122` with `Σmovements=0`; seeded `reserved` with no reservation rows). Therefore the *absolute* identity `onHand == Σmovements` holds only on a warehouse built from zero. **This is why the expanded harness uses delta-tracking invariants** (`Δprojection == Δledger`) on real warehouses — a stronger, seed-robust test.
3. **No models** for PickList/CycleCount/InventoryAdjustment/StockTransfer. Picking is `ShipmentLine.pickedQty/packedQty/shippedQty` (fulfillment markers that move no stock). Adjustments/transfers are movement types.
4. **No automated reservation-expiry sweeper** — `expiresAt` is currently decorative; expiry requires a status change nothing performs (documented in the harness).

**Current verification.** Pre-expansion **12/12**. Expanded harness (reservation + picking lifecycles, delta invariants) **written and typechecking; not yet run**.

**Future direction / remaining work (RECOMMENDATION).** Run + green the expanded harness; then extract `lib/inventory/*` **Core Services** (inventory read-models, valuation report, stock-ledger view) mirroring `lib/procurement/*`; build Inventory Dashboard + Reports on the enterprise kit; consider consolidating on the recompute-from-ledger strategy (or add opening-balance movements so the projection *is* rebuildable); decide reservation-expiry policy; then Architecture Review → Runtime gate → `CAP_INVENTORY_V1_RELEASE.md` → Freeze.

---

## 11. Procurement Analysis (deep, FACT)

Procure-to-pay mirroring Sales. Write path: `requisition.ts` → `procurement.ts` (`approveSupplierBill → SupplierBillApproved`) → `payables.ts` (`registerSupplierPayment → SupplierPaymentRegistered`), plus `receipt.ts`/`inventory.ts` (`processGoodsReceiptRequest → GoodsReceiptCompleted`). Accounting: GR increments the projection + blends WAC; **bill approval** posts DR 1200 / CR 2000 and creates `PayableEntry`; **payment** posts DR 2000 / CR 1000 and settles the subledger (`PayableEntry.paidAmount`→PAID, `SupplierBill`→PAID). Read models: `vendor-ledger` (on shared engine), `payables-aging`, `procurement-dashboard`, `procurement-reports`, `vendor-360` — all reconcile (verified 18/18). Idempotency 7/7. **Notable design:** physical stock is tracked at receipt (projection), but the GL inventory asset is booked at bill approval — no double-count. **Debt/limits:** see §9. **Quality:** high; frozen.

---

## 12. Sales Analysis (deep, FACT)

Order-to-cash. Write path: `quotation.ts` → `sales-order.ts` (`confirmSalesOrder → SalesOrderConfirmed → reservation`; `cancelSalesOrder` releases: restores projection, zeroes line, **deletes** reservation) → `fulfillment.ts` (shipment; `ShipmentDispatched → stock-out + COGS + dispatch-invoice`) → `invoice.ts` (`createCustomerInvoice`/`recordInvoicePayment`, integral posting). Read models: `customer-ledger`, `receivables-aging`, `sales-dashboard`, `sales-reports`, `customer-360`. **Gotcha (FACT):** `SalesOrder.totalAmount` and `Quotation.totalAmount` are **Float** (no `.toNumber()`); `CustomerInvoice`/`CustomerPayment` amounts are **Decimal** (`.toNumber()`). Frozen; 25/25. **Quality:** high; canonical reference.

---

## 13. Finance Analysis (FACT)

**What's complete:** a **large service library** in `lib/finance` (~30 files): `posting-engine`, `ledger-engine`, `sales-posting`, `customer-ledger`/`vendor-ledger`, `receivables-aging`/`payables-aging`, `wac`, `trial-balance-service`, `profit-loss-service`, `balance-sheet-service`, `cash-flow-service`, `financial-reporting`, `period-close-service`/`period`, `reconciliation-service`, `bank-service`, `budget-service`/`budget-variance-service`, `fixed-asset-service`/`asset-capitalization`/`asset-disposal`/`depreciation-engine`, `tax-engine`/`tax-accounting`/`tax-master`/`gst-reporting`, `cash-forecasting-engine`, `management-reporting-service`, `controls-service`, `supplier-bill-service`. Trial Balance/P&L/Balance Sheet read `JournalLine` aggregates, so postings flow through automatically. Models exist for FixedAsset/Depreciation, Bank reconciliation, Budgets, Tax/GSTR1/2B/3B, E-Invoice/E-Way Bill.

**What depends on it:** Sales and Procurement depend on `posting-engine`, `sales-posting`, ledger/aging — all frozen and verified. So the **core accounting spine is proven**.

**What still needs building (FACT/RECOMMENDATION):** the **Finance UI is thin/mock** — `app/actions/finance.ts` exports only 2 functions; routes exist (`finance/{accounting,assets,close,payables,receivables,statements,treasury}`) but many are shells/mock (42 of 150 pages still import `_data/`). The advanced services (assets, depreciation, tax/GSTR, budgets, bank reconciliation, cash forecasting) are **not runtime-verified end-to-end**. Finance is the natural vertical **after** Inventory: wire UI to the existing services, then build a `finance-runtime.ts` gate (period-close correctness, trial balance = Σledger, depreciation schedules, GST returns) before any freeze.

---

## 14. Technical Debt

**Critical (RECOMMENDATION).**
- **Dual architecture** (`packages/domain` + `apps/backend` unused by the active app). Risk of divergence and wasted effort; needs an explicit decision (migrate vs. retire).
- **No background job runner** in the active path — outbox drained synchronously per request. Long chains and failed events have no async retry/DLQ. `OPERATIONS_CENTER_DESIGN.md` exists but unbuilt.
- **Projection not rebuildable from ledger** (Inventory) — no opening-balance movements; a projection-rebuild would zero real stock.

**Medium.**
- **`event.payload as any` / `tx: any`** pervasive in `handlers.ts` (11 pre-existing lint errors) and `inventory.ts` — typed event payloads deferred.
- **42/150 pages still mock-backed** (`_data/`) — Finance/CRM/HR/sub-apps.
- **Legacy `finance.prisma`/`logistics.prisma`** duplicate models — confusing; should be removed or clearly quarantined.
- **Verification not in CI** — dev-route-driven only.

**Low.**
- ~167 repo-wide `no-explicit-any` in non-frozen modules (documented; not from frozen code).
- Reservation `expiresAt` decorative (no sweeper).
- Report exports CSV/Print only.

**Future enhancement.**
- Credit control (limits/holds/exposure); CreditNote/DebitNote domain; PDF/XLSX exports + saved presets; Operations Center (workflow monitor, outbox queue, DLQ replay, audit explorer); generalized cross-module verification framework.

---

## 15. Risks

- **Architectural:** the two-architecture split is the top risk — silent divergence, onboarding confusion, and the temptation to "finish" the DDD backend mid-vertical. **Mitigation:** decide explicitly; keep shipping on the active architecture.
- **Consistency:** synchronous outbox means a crash mid-chain can leave partial state with no async recovery; the projection/ledger duality can drift. **Mitigation:** the idempotency guards + runtime invariants are the current safety net; an async runner + a projection-rebuild story are the durable fix.
- **Performance/scaling:** synchronous drain ties side-effect latency to request latency; dashboards use `groupBy`/aggregate (reasonable) but there is no caching layer; Neon serverless connection pattern (ws adapter) must be watched under load. Projections partially mitigate read cost.
- **Security:** RBAC (`requirePermission`) + `logAudit` on mutations + `businessId` scoping are enforced in frozen modules and verified; **but** many mock pages/routes are unguarded shells — do not treat non-frozen routes as secure. See `[[permission-catalog]]` note: use `inventory.read`/`sales.read`/`procurement.read` (there is **no** `product.read`).
- **Business:** Finance breadth (assets/tax/GST) is modeled but unverified — do not represent it as production-ready.

---

## 16. Design Decisions (FACT + rationale)

1. **One production-complete vertical at a time, verified at runtime before freeze.** Rationale: provable money/stock correctness over feature breadth; it has repeatedly caught real bugs.
2. **Integral double-entry posting** (`postEntry` rejects unbalanced; invoice rolls back if it can't post). Rationale: ledger and subledger can never silently diverge.
3. **Subledger is the single source of truth for settled amounts**; ledgers add a reconciling line. Rationale: statements = aging = dashboard always tie out.
4. **Transactional outbox + synchronous drain.** Rationale: explicit, replayable side effects without standing up a job runner yet.
5. **Idempotency via handler guards** (existence checks / correlationId). Rationale: event replay is where ERP systems fail; guards make handlers no-ops on replay.
6. **Shared ledger engine reused by AR and AP** (not merged domains). Rationale: DRY mechanics, separate business rules.
7. **Enterprise UI kit + config-driven reporting** reused across every screen. Rationale: one design system, minimal per-page code.
8. **Runtime harnesses are non-mutating and self-cleaning**, keyed to the resolved business. Rationale: repeatable release gates that don't contaminate the DB (learned the hard way — the wrong-business-restore bug).
9. **WAC owned by Procurement, immutable to Inventory ops.** Rationale: a clear valuation boundary — only receipts/adjustments/returns change unit cost.
10. **Delta-tracking invariants for seeded data.** Rationale: absolute `onHand == Σmovements` is false for denormalized seeded projections; `Δprojection == Δledger` is the correct, seed-robust invariant.

---

## 17. Shared Frameworks (FACT)

- **Enterprise UI kit** (`components/enterprise/*`) — every list/report/dashboard screen.
- **Config-driven reporting** (`EnterpriseReportLayout` + `EnterpriseReportTable`) — all Sales/Procurement registers; reuse for Inventory/Finance.
- **Chart wrappers** (`components/ui/chart-wrappers`) — all dashboards/aging.
- **Ledger engine** (`buildLedger`) — customer-ledger + vendor-ledger.
- **Posting engine** (`FinancialPostingService`) — every journal.
- **Outbox** (`processor`/`registry`/`handlers`) — every event side effect.
- **Audit** (`lib/audit.ts` `logAudit`) — every mutation.
- **Verification framework** (`lib/verification/*` + `/api/dev/verify-*`) — every module's release gate. **Emerging shared piece:** `inventory-invariants.ts` (`snapshotInventory`, `checkInvariants`, `checkWacUnchanged`) — the seed of a common verification kit. **RECOMMENDATION:** after Inventory freezes, extract a generic `verification-kit` (context/setup + invariant + cleanup) shared by all runtimes — the wrong-business-restore bug proved this logic should be centralized.

---

## 18. Business Workflows (end-to-end, FACT)

- **Sales (order-to-cash):** Quotation → (accept) → Sales Order → approve → **confirm (reserves stock via event)** → Shipment (pick→pack→**dispatch** = stock-out + COGS + auto-invoice, all posted) → Invoice → Payment → Journal → GL → Customer Ledger → Statement → Aging → Dashboard → Reports → Customer 360 → Audit.
- **Procurement (procure-to-pay):** Purchase Requisition → Purchase Order → Goods Receipt (**stock-in + WAC blend**) → auto Supplier Bill → approve (**AP + journal**) → Supplier Payment (**journal + subledger settle**) → GL → Vendor Ledger → Statement → AP Aging → Dashboard → Reports → Vendor 360 → Audit.
- **Inventory (system of record):** movements IN/OUT/TRANSFER/ADJUSTMENT/RETURN → projection (`onHand = ΣIn − ΣOut ± Adj ± Return`; `available = onHand − reserved`); reservations reserve→(cancel/expire/fulfil); picking markers on ShipmentLine; stock-out on dispatch (replay-safe). WAC changes only on valuation events.
- **Finance (accounting):** all of the above post through `FinancialPostingService` into `JournalEntry`/`JournalLine`; Trial Balance/P&L/Balance Sheet aggregate journal lines; period must be OPEN to post. (Assets/tax/budget/bank-rec workflows exist as services, not yet UI-wired/verified.)
- **Reporting:** config-driven registers + printable summaries; dashboards reuse aging/ledger services.

---

## 19. Database Analysis (FACT)

- **Active schema:** `packages/database/prisma/schema.prisma` (~110 models, 2371 lines). Multi-tenant: `Tenant` → `Business` (every domain row carries `businessId`, most carry `tenantId`).
- **Aggregate roots (inferred):** `SalesOrder`(+lines), `Quotation`(+lines), `Shipment`(+lines), `PurchaseRequisition`/`PurchaseOrder`(+lines), `GoodsReceiptRequest`(+lines), `SupplierBill`(+lines), `CustomerInvoice`(+lines), `InventoryRecord`(+movements/reservations), `JournalEntry`(+lines), `FixedAsset`(+depreciation).
- **Subledgers:** `ReceivableEntry`, `PayableEntry` (`.paidAmount` authoritative).
- **Event boundary:** `OutboxEventRecord` (Json payload) between aggregates.
- **Projections / read models:** `InventoryVariantProjection`, `DashboardProjection`, `ExecutiveDashboardProjection`, `SalesReportProjection`, `ProcurementReportProjection`, `InventoryReportProjection`, `MovementTimelineProjection`, `SupplierPerformanceProjection`. (Some are populated by the active app; others belong to the DDD backend's projection worker — verify before relying.)
- **Accounting:** `LedgerAccount`/`Account` (by `accountCode`), `AccountingPeriod`/`FinancialPeriod` (must be OPEN), `JournalEntry`/`JournalLine`, `CashTransaction`.
- **Decimal vs Float (critical):** order/PO/PO-line/quotation `totalAmount` are **Float**; invoice/bill/payment amounts are **Decimal** (`.toNumber()`); projection `averageCost` is **Decimal**, quantities are **Float**.

---

## 20. Folder Structure (FACT)

```
COSMY-BOS/
├─ apps/
│  ├─ frontend/                 ← THE ACTIVE APP (Next.js 16)
│  │  └─ src/
│  │     ├─ app/
│  │     │  ├─ (dashboard)/{sales,procurement,inventory,finance,reports,
│  │     │  │               governance,operations,business,salam-cola,uco,lumas}
│  │     │  ├─ actions/         ← server actions ("use server") — the write path
│  │     │  └─ api/dev/         ← verify-*, inspect-variant, recent-*, cleanup-verify
│  │     ├─ lib/
│  │     │  ├─ finance/         ← posting/ledger engines, ledgers, aging, WAC, assets, tax, budgets…
│  │     │  ├─ sales/           ← customer-360, sales-dashboard, sales-reports
│  │     │  ├─ procurement/     ← vendor-360, procurement-dashboard, procurement-reports
│  │     │  ├─ outbox/          ← processor, registry, handlers (event side effects)
│  │     │  ├─ verification/    ← *-runtime.ts + inventory-invariants.ts (release gates)
│  │     │  ├─ audit.ts, server-auth.ts, db.ts, branding.ts, csv.ts …
│  │     └─ components/
│  │        ├─ enterprise/      ← data/ feedback/ forms/ layout/ security/ (design system)
│  │        └─ ui/              ← primitives + chart-wrappers
│  └─ backend/                  ← DDD multi-process backend (api/worker/scheduler/projection/ai) — NOT wired to frontend
├─ packages/
│  ├─ database/prisma/          ← schema.prisma (ACTIVE) + finance.prisma/logistics.prisma (legacy)
│  ├─ domain/src/{banking,crm,documents,finance,identity,inventory,ops,purchasing,sales,shared}  ← DDD (parallel)
│  ├─ application, contracts, infrastructure, platform-core, platform-runtime, shared-kernel, ai-gateway, certification
├─ scripts/ , deploy/ , docs/ , certification/
└─ *.md                         ← reports, CAP_*_RELEASE, *_ARCHITECTURE_REVIEW, WAC_VERIFICATION, this handover
```

---

## 21. Code Quality Review (RECOMMENDATION grounded in FACT)

**Strengths.** Clean dependency direction (UI→service→engine); integral accounting; single-source-of-truth subledgers; reused design system + reporting framework; **best-in-class runtime verification**; honest, well-written release/architecture docs; idempotent event handlers.

**Weaknesses.** Pervasive `as any` on event payloads / `tx`; two architectures; 42 mock pages; legacy schema files; verification outside CI; Finance breadth unverified.

**Duplication.** Largely avoided in frozen modules (shared ledger/report/dashboard kits). Remaining duplication: setup/cleanup logic across the 5 runtime harnesses (the reason to extract a shared verification kit); legacy prisma files.

**Abstractions.** Well-judged: `buildLedger`, `postEntry`, config-driven `EnterpriseReportTable`, outbox registry. Not over-abstracted.

**Overall (RECOMMENDATION):** the *transactional core* is high-quality, enterprise-grade, and genuinely production-ready for Sales + Procurement. The *periphery* (Finance UI, sub-apps, CRM/HR) is prototype-grade. The gap between the two is the honest state of the product.

---

## 22. Suggested Refactoring (architecture-preserving only, RECOMMENDATION)

1. **Extract a shared `verification-kit`** (`resolveBusinessContext`, `withCleanup`, invariant helpers) from the 5 runtimes — centralizes the wrong-business-restore fix. *(Do after Inventory freeze.)*
2. **Type the outbox payloads** — a discriminated union per `eventType`, replacing `event.payload as any` in `handlers.ts`. Removes 11 lint errors, adds safety. *(Non-behavioral.)*
3. **Quarantine or delete `finance.prisma`/`logistics.prisma`** to end the duplicate-model confusion.
4. **Add the verify-* routes to a CI smoke step** against a disposable Neon branch.
5. **Decide the projection-rebuild story** for Inventory (opening-balance movements *or* commit to recompute-from-ledger) — do not silently keep both strategies.
None of these change the architecture; they harden it.

---

## 23. Roadmap

**Immediate (this sprint):** run + green the expanded Inventory harness; regression sweep; build/lint.
**Short term:** Inventory Core Services → Dashboard → Reports → Architecture Review → Runtime gate → `CAP_INVENTORY_V1_RELEASE.md` → **Freeze CAP-INVENTORY V1.0**. Retire dead `as any`/`tx: any` via typed payloads. Extract shared verification kit.
**Medium term:** **Finance vertical** — wire UI to existing services (accounting, statements, payables/receivables, period close, assets), build `finance-runtime.ts` gate (trial balance = Σledger, period-close, depreciation, GST returns), then freeze CAP-FINANCE V1.0. Build the **Operations Center** (workflow monitor, outbox queue, DLQ replay, audit explorer) — this also delivers the background job runner.
**Long term:** decide the **DDD backend** question (migrate the async worker/scheduler/projection path in, or retire it); CRM & HR greenfield; PDF/XLSX exports + saved presets; credit-control + CreditNote/DebitNote; multi-region/perf hardening; move verification into CI.

---

## 24. Next Tasks (ordered implementation queue)

1. **Run expanded Inventory harness.** Purpose: confirm reservation+picking scenarios + delta invariants pass. Deps: dev server on live Neon. Risk: low (typechecks). Effort: minutes. Verify: `/verify-inventory` all green.
2. **Fix any harness failures.** Purpose: correctness. Deps: #1. Risk: med (may reveal more real bugs). Effort: hours. Verify: re-run green.
3. **Regression sweep + build/lint.** Purpose: protect frozen modules. Deps: #2. Risk: low. Effort: minutes. Verify: sales 25 / proc 18 / wac 10 / idemp 7; `/inspect-variant` baseline 4322 @ 146.0186 / 0 orphans; `npm run build` + `tsc` EXIT 0.
4. **Extract `lib/inventory/*` Core Services** (stock read-models, valuation report, stock-ledger view) mirroring `lib/procurement/*`. Deps: #3. Risk: low. Effort: 0.5–1 day. Verify: extend inventory-runtime read-model assertions.
5. **Inventory Dashboard + Reports** on the enterprise kit. Deps: #4. Risk: low. Effort: 1 day. Verify: render + tie-out to services.
6. **Inventory Architecture Review + full Runtime gate + `CAP_INVENTORY_V1_RELEASE.md` + Freeze.** Deps: #5. Risk: low. Effort: 0.5 day. Verify: full gate green, docs written.
7. **(Then) Finance vertical** per §23 medium-term. Deps: #6. Risk: med-high (breadth). Effort: multi-session. Verify: new `finance-runtime.ts`.

---

## 25. Current State Snapshot (RESUME POINT — read this to continue immediately)

> **UPDATE 2026-07-26:** **CAP-INVENTORY V1.0 is now FROZEN** — OCTIEN's third production-complete transactional domain. Full lifecycle complete (backend verify → core services → UI → architecture review → runtime gate → release → freeze). Runtime **78/78** (`/api/dev/verify-inventory`, incl. Part D read-model tie-outs + audit); full regression sweep GREEN (Sales 25/25, Procurement 18/18, Inventory 78/78, WAC 10/10, Idempotency 7/7); build/tsc/lint clean; 14 UI routes render 200; projection consistency 0 inconsistent/7. Docs: `INVENTORY_ARCHITECTURE_REVIEW.md`, `CAP_INVENTORY_V1_RELEASE.md`. **The stock-OUT replay gap logged in CAP-PROCUREMENT is resolved.**
> **THE NEXT MAJOR PHASE IS FINANCE** (see §13): a large existing `lib/finance` service library behind a thin/mock UI — verify-first the accounting spine (trial balance = Σledger, period close, depreciation, GST) via a new `finance-runtime.ts` gate, then wire UI, then freeze CAP-FINANCE V1.0.
> **RELEASE-ENGINEERING GOTCHAS (learned this freeze):** (1) the posting engine needs an **OPEN `AccountingPeriod` covering `new Date()`** — the seed's periods may not cover the current month; run `GET /api/dev/ensure-period` before any regression sweep or postings throw "No open accounting period found" and cascade. (2) **Run verify harnesses SOLO**, never in a shell `for` loop — a loop hits the 2-min tool timeout, SIGKILLs a run mid-flight, and skips its `finally` cleanup. (3) `/api/dev/inspect-variant?scanall=1&repairall=1` scans/repairs projection `available = onHand − reserved`; `/api/dev/reset-verify` clears stale outbox events + verify entities if a run was killed.

The below reflects the earlier Phase-2 snapshot; Inventory has since been fully built and frozen (see the update box above).

- **Vertical:** Inventory — **FROZEN** (was Phase 2 engine hardening; now complete through freeze).
- **Completed & verified (FACT, run against live Neon):**
  - `apps/frontend/src/lib/verification/inventory-invariants.ts` — shared invariant kit (`snapshotInventory`, `checkInvariants(base,cur,label)` = delta-tracking identity + availability + valuation, `checkWacUnchanged`).
  - `apps/frontend/src/lib/verification/inventory-runtime.ts` — Part A (isolated movement→projection identity), Part B (reservation lifecycle: reserve / double-replay / cancel / re-reserve-after-cancel / expire / all-or-nothing), Part C (picking lifecycle: pick/partial-pick/unpick/re-pick/pack/ship-prep proven NOT to move stock or change WAC; then dispatch stock-out + replay). All invariants delta-based.
  - **Result: `/api/dev/verify-inventory` → 70/70.** Regression: Sales 25/25, Procurement 18/18, WAC 10/10, Idempotency 7/7. Baseline non-mutating (4322 @ 146.0186, 0 orphans). Build EXIT 0, lint (new files) clean.
- **Handler changes applied & regression-checked:** `InventoryReservationRequested` guard scoped to `status ∈ {ACTIVE, FULFILLED}` (allows re-reserve after cancel/expire); `InventoryStockOutRequested` early-return guard on `correlationId = SHP-<shipmentId>`.
- **DB baseline (clean):** first product variant on Salam Cola → MAIN onHand 4200 + DISTRIBUTOR 122 = **4322**, uniform `averageCost = 146.0186178180227`, **0 orphans**. Check with `/api/dev/inspect-variant`; restore with `?purge=1&setwac=146.0186178180227&setonhand=MAIN:4200,DISTRIBUTOR:122` if a run ever drifts it.
- **THE VERY NEXT ACTION:** begin **Inventory Core Services** — extract `lib/inventory/*` (stock read-models, valuation report, stock-ledger view) mirroring `lib/procurement/*`, then Inventory Dashboard + Reports (enterprise kit) → Architecture Review → full Runtime gate → `CAP_INVENTORY_V1_RELEASE.md` → Freeze CAP-INVENTORY V1.0.
- **Dev login for authenticated checks:** `owner@cosmy.ai` / `Owner@123` (NOT `CosmyDemo@2026`).

---

## 26. Important Context (must-remember, FACT)

- **Frozen = bug-fix only:** Sales (CAP-SALES V1.0) and Procurement (CAP-PROCUREMENT V1.0). Editing shared handlers is allowed but **must** be re-verified via `/verify-sales` (25) and `/verify-procurement` (18).
- **Outbox `payload` is a `Json` column** → pass plain objects, never `JSON.stringify`.
- **Decimal vs Float:** order/PO/quotation `totalAmount` = Float (no `.toNumber()`); invoice/bill/payment = Decimal (`.toNumber()`); projection `averageCost` = Decimal, quantities = Float.
- **Posting requires an OPEN `AccountingPeriod`** or `postEntry` throws (invoice/bill fails closed). Script: `scripts/ensure-open-periods.mjs`.
- **Chart of accounts:** 1000 Cash&Bank, 1100 AR, 1200 Inventory, 2000 AP, 2100 Output GST, 4000 Revenue, 5000 COGS. `2100` is ensured at runtime (wasn't seeded).
- **Permissions catalog:** use `sales.read`/`inventory.read`/`procurement.read`/`finance.write`/`fulfillment.create|update`/`purchase_requisition.*` — there is **NO** `product.read`.
- **Active schema is `schema.prisma`**; `finance.prisma`/`logistics.prisma` are legacy — ignore.
- **`packages/domain` + `apps/backend` are NOT wired into the active app** — don't build against them for the current verticals.
- **Verification harnesses must stay non-mutating** — always capture the resolved `businessId` once and reuse it in `finally`; restore projections; self-heal `WH-INVVER` strays.
- **Read `node_modules/next/dist/docs/`** before writing Next.js 16 code (breaking changes; `params` is a Promise).
- **Windows/PowerShell dev env**; the Prisma query-engine DLL can `EPERM` during build if a node process holds it — kill node, retry.
- **No memory carries to the new account** — this document is the memory. The prior memory index also references `permission-catalog`, `business-context-fallback` (requireBusinessContext falls back to home-tenant Salam Cola if no cookie), `demo-credentials-verification`, `octien-branding-system` (product is OCTIEN by Aeterex; central `branding.ts` + `BrandLogo` + PoweredByAeterex watermark), and `core-spine-completion-program` (the vertical-by-vertical plan).

---

## 27. Project Assessment (my engineering judgment)

- **Architecture:** 8/10 for the active core (clean, event-driven, correct); dragged down by the unwired dual architecture and synchronous-only outbox.
- **Maintainability:** 7/10 — excellent shared frameworks and docs; hurt by `as any`, mock pages, legacy schemas.
- **Scalability:** 6/10 — projections help reads; synchronous drain and no job runner cap write throughput; Neon serverless is fine near-term.
- **Modularity:** 8/10 — vertical boundaries are crisp; shared kits are well-factored.
- **Domain modeling:** 8/10 — subledgers, aggregates, event boundaries, WAC ownership are thoughtfully modeled.
- **ERP quality / enterprise readiness:** **Sales + Procurement 8.5/10** (genuinely production-grade); **rest 3–5/10** (prototype). Weighted overall ~6/10, trending up per vertical.
- **Technical & code quality:** 7/10 core, 4/10 periphery.
- **Documentation:** 9/10 for release/architecture/verification docs — unusually strong.
- **Testing strategy:** unit tests are sparse; **runtime verification is the testing strategy and it is excellent (9/10)** for covered modules — its main gap is CI integration and breadth (Finance).
- **Production readiness:** **Sales + Procurement: yes** (with documented limits). **Everything else: no.**

**Bottom line:** this is a disciplined, correctness-first ERP core with two credibly-frozen transactional domains and a standout runtime-verification culture, wrapped in a much larger, mostly-unfinished surface. Continue the exact playbook: harden Inventory to parity, freeze it, then do Finance.

---

## 28. Final Resume Prompt (paste into a fresh Claude conversation)

> **Project:** OCTIEN ERP (by Aeterex; formerly "COSMY ERP") — a multi-tenant, multi-business ERP (businesses: Salam Cola, COSMY UCO, Casa de Lumas). Repo root `D:\cosmyerp\COSMY-BOS`. Windows + PowerShell (Bash tool also available). No prior memory — treat this prompt as ground truth and verify against the repo.
>
> **Stack:** Next.js 16.2.9 App Router + Turbopack, React 19, TypeScript strict; Prisma 6.19.3 with the Neon serverless adapter (`@prisma/adapter-neon`, `ws`). Active schema: `packages/database/prisma/schema.prisma` (~110 models). `finance.prisma`/`logistics.prisma` are LEGACY — ignore. Dev login for authenticated checks: `owner@cosmy.ai` / `Owner@123`.
>
> **Active architecture (where all real work lives):** UI → server action (`apps/frontend/src/app/actions/*.ts`, `"use server"`) → domain service (`apps/frontend/src/lib/*`) → posting/ledger engine (`lib/finance/*`) → Prisma → Neon. Side effects via a transactional **outbox** (`OutboxEventRecord`, `payload` is a **Json** column — pass plain objects, never `JSON.stringify`) drained **synchronously** by `lib/outbox/processor.ts` (`drainOutbox`), with handlers in `lib/outbox/handlers.ts`. NOTE: `packages/domain` + `apps/backend` are a PARALLEL DDD architecture NOT imported by the frontend — do not build against them.
>
> **Accounting:** `lib/finance/posting-engine.ts` `FinancialPostingService.postEntry` rejects unbalanced entries and requires an OPEN `AccountingPeriod`. Accounts: 1000 Cash&Bank, 1100 AR, 1200 Inventory, 2000 AP, 2100 Output GST, 4000 Revenue, 5000 COGS. Shared `lib/finance/ledger-engine.ts` `buildLedger` powers customer-ledger + vendor-ledger; subledgers (`ReceivableEntry`/`PayableEntry.paidAmount`) are the single source of truth. **Gotchas:** order/PO/quotation `totalAmount` = Float (no `.toNumber()`); invoice/bill/payment = Decimal (`.toNumber()`); projection `averageCost` = Decimal. Permissions use `sales.read`/`inventory.read`/`procurement.read`/`finance.write` — there is NO `product.read`.
>
> **Verification framework (the project's signature):** `lib/verification/*-runtime.ts` + dev routes `/api/dev/verify-*` run the REAL code against LIVE Neon, assert DB state, and self-clean. Harnesses must be NON-MUTATING: capture the resolved `businessId` once and reuse it in `finally` (a wrong-business restore bug previously leaked stock and polluted WAC). Support route `/api/dev/inspect-variant` lists/purges orphaned projections and restores WAC/onHand.
>
> **Frozen capabilities (BUG-FIX ONLY, never re-architect):** CAP-SALES V1.0 (runtime 25/25; `SALES_ARCHITECTURE_REVIEW.md`, `CAP_SALES_V1_RELEASE.md`) and CAP-PROCUREMENT V1.0 (runtime 18/18, WAC 10/10, idempotency 7/7; `PROCUREMENT_ARCHITECTURE_REVIEW.md`, `CAP_PROCUREMENT_V1_RELEASE.md`). If you edit shared handlers, re-verify `/verify-sales` and `/verify-procurement`.
>
> **Current vertical — Inventory (in progress, "verify first, build second"):** Inventory is the system of record for stock + valuation. Models: `InventoryRecord`, `StockMovementRecord` (String `type`: RECEIVED/FULFILLED/TRANSFERRED_OUT/ADJUSTED/RETURN; signed Float qty; `correlationId`), `ReservationRecord` (status ACTIVE/FULFILLED/CANCELLED/EXPIRED), `InventoryVariantProjection` (onHand/reserved/available Float, averageCost Decimal). No PickList/CycleCount/Adjustment/Transfer models — picking is `ShipmentLine.pickedQty/packedQty/shippedQty` (moves no stock); adjustments/transfers are movement types. Backend already verified 12/12 and TWO real replay bugs were found & fixed: stock-OUT replay (guard on `correlationId=SHP-<shipmentId>`) and reservation replay (guard on `status∈{ACTIVE,FULFILLED}`, which also allows re-reserve after cancel/expire). KEY FINDING: the projection is a denormalized cache NOT reconstructable from the movement ledger for seeded data (seeded onHand with Σmovements=0), so invariants use **delta-tracking** (`Δprojection == Δledger`) not absolute identity.
>
> **EXACT RESUME POINT:** THREE transactional domains are now FROZEN — CAP-SALES V1.0 (25/25), CAP-PROCUREMENT V1.0 (18/18), CAP-INVENTORY V1.0 (78/78). Inventory shipped its full `lib/inventory/*` service layer (stock-balance, stock-ledger, inventory-valuation, inventory-dashboard, inventory-reports, inventory-360, inventory-utils) + 14 UI routes + `INVENTORY_ARCHITECTURE_REVIEW.md` + `CAP_INVENTORY_V1_RELEASE.md`. Runtime harness `inventory-runtime.ts` is the release gate (Part A engine identity, Part B reservation lifecycle, Part C picking+dispatch, Part D read-model tie-outs + audit). Reservation guard `status∈{ACTIVE,FULFILLED}`; stock-out guard `correlationId=SHP-<shipmentId>`. Baseline: Salam Cola first variant = MAIN 4200 + DISTRIBUTOR 122 = 4322 @ averageCost 146.0186178180227, 0 orphans, 0 inconsistent projections.
>
> **DO THIS NEXT — FINANCE (the enterprise backbone; see handover §13).** Finance has a LARGE existing service library (`lib/finance/*`, ~30 services: posting-engine, ledger-engine, sales-posting, customer/vendor-ledger, receivables/payables-aging, WAC, trial-balance, profit-loss, balance-sheet, cash-flow, period-close, reconciliation, bank, budgets, fixed-asset/depreciation, tax/GSTR, cash-forecasting) but a THIN/MOCK UI (`app/actions/finance.ts` exports only 2 functions; 42/150 pages still import mock `_data/`). Follow the SAME lifecycle that froze the other three: (1) **verify-first** — build `lib/verification/finance-runtime.ts` + `/api/dev/verify-finance` proving accounting-spine correctness against live Neon: trial balance = Σ journal lines, period-close correctness, depreciation schedules, GST returns (GSTR1/2B/3B), bank reconciliation; find+fix bugs. (2) Wire the Finance UI (`finance/{accounting,statements,payables,receivables,assets,close,treasury}`) to the existing services — thin pages, no logic in UI, enterprise kit. (3) Dashboard + Reports. (4) `FINANCE_ARCHITECTURE_REVIEW.md` → full runtime gate → `CAP_FINANCE_V1_RELEASE.md` → Freeze CAP-FINANCE V1.0. **BEFORE any run:** `GET /api/dev/ensure-period` (posting needs an OPEN AccountingPeriod for `new Date()`). Run harnesses SOLO, never in a loop (2-min timeout SIGKILLs mid-run and skips cleanup). Regression-verify the three frozen modules after any shared change (sales/procurement/inventory/wac/idempotency). Windows: real repo path is `D:\1\cosmyerp\COSMY-BOS` (D:\cosmyerp is a junction; Bash uses `/d/1/cosmyerp/COSMY-BOS`); if Prisma DLL EPERM on build, kill node and retry.
>
> **Working style:** one production-complete vertical at a time; verify at runtime against live Neon before freezing; reuse existing services/UI (never duplicate logic); keep dependency direction UI→service→ledger→engine; no mock data in completed modules; be honest about gaps; respect frozen modules. The full engineering handover is in `PROJECT_HANDOVER.md` at the repo root — read it for anything this prompt omits.
