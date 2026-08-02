# CAP-FINANCE V1.0 — Phase 1: Backend Inventory & Gap Analysis

**Date:** 2026-08-03 · **Status:** Phase 1 (verify-first) — inventory + gap analysis **before** any build.
**Method:** evidence-based. Every classification below is backed by a codebase measurement (exported
symbols, cross-file usage counts, import maps, source reads), not assumption. No code changed in
this phase.

> **Bottom line up front.** Finance has a **large service library (~31 files, ~3,900 LOC)** but only a
> **thin slice is wired**: `FinancialPostingService` (posting), `FinancialReportingService` (Trial
> Balance / P&L / Balance Sheet), `getCurrentPeriod`, and the frozen AR/AP subledgers. **~20 service
> classes have zero consumers** (implemented but unintegrated), **4 are dead duplicates**, and the UI
> is mostly mock/shell. The verified accounting spine that works today is **post → JournalEntry →
> FinancialReportingService (TB/P&L/BS)**, already exercised by the three frozen modules. Finance V1
> should **verify and expose** that spine (and selectively wire the real unwired services), **not
> rebuild** anything.

---

## 1. How the evidence was gathered
- Enumerated every `lib/finance/*.ts` file, its exported symbols, and LOC.
- Counted cross-file references to each service **outside its own file** (`grep -rl` over `app/` + `lib/`) → **wired vs dead**.
- Mapped every `finance/*` UI page's imports → **real service vs `_data/` mock vs no-import shell**.
- Read the canonical services in full (`posting-engine`, `financial-reporting`, `period-close`, `gst-reporting`, `sales-posting`) and sampled the rest for "posts GL / writes DB / method count".

---

## 2. Service Inventory (all 31 files)

### Category A — WIRED & production-grade (keep, verify, expose)
| Service | File | Role | Evidence of wiring | Verdict |
|---|---|---|---|---|
| `FinancialPostingService` | posting-engine.ts | Double-entry posting; rejects unbalanced; requires OPEN `AccountingPeriod`; resolves account by code (**throws if missing**); cost-center validation | consumers: `sales-posting`, `outbox/handlers` — proven by frozen GL-balanced checks | **Production-ready** |
| `FinancialReportingService` | financial-reporting.ts | Trial Balance (opening+period+closing, normal-balance rules, validity check), P&L, Balance Sheet (injects P&L into equity), account hierarchy rollup | consumers: 4 finance pages (trial-balance, pnl, balance-sheet, close/checklist) | **Production-ready** (read-side); minor debt: 3× `@ts-ignore`/`as any` on `groupBy`; **no cash-flow, no closing entry** |
| `getCurrentPeriod` | period.ts | Resolve current `AccountingPeriod` | consumers: 5 finance pages | Production-ready |
| `ensureSalesLedgerAccounts`, `postCustomerInvoiceJournal`, `postCustomerPaymentJournal`, `splitInclusiveGst` | sales-posting.ts | CoA seed (typed) + AR postings | **FROZEN (Sales)** | Production-ready |
| `getCustomerLedger` / `getVendorLedger` / `getReceivablesAging` / `getPayablesAging` / `buildLedger` / `wac` | (respective) | AR/AP subledgers, aging, ledger engine, WAC | **FROZEN (Sales/Procurement/Inventory)** | Production-ready |
| `CashForecastingEngine`, `ManagementReportingService` | (respective) | Cash forecast + management reports (compute-only) | consumers: `lib/dashboard/dashboard-service.ts` → `_data/dashboard-fetchers.ts` | Wired (compute-only) |

### Category B — REAL but UNWIRED (implemented, **zero consumers**; verify → wire or defer)
| Service | Posts GL? | Writes DB? | Notes | Verdict |
|---|---|---|---|---|
| `DepreciationEngine` | **yes (1)** | yes (8) | Real depreciation poster + schedules | Verify + wire (asset chain) |
| `PeriodCloseService` | no | yes (3) | Soft/hard close + `assertPeriodIsOpen` on **`FinancialPeriod`** (⚠ different model than posting — see Gap #1); **no closing/retained-earnings journal** | Verify + **reconcile period models** |
| `FixedAssetService` / `AssetCapitalizationService` / `AssetDisposalService` | no / no / no | 2 / 3 / 0 | Asset lifecycle; capitalization writes asset but **no GL post** (gap); disposal 0 writes/posts (calc-only or thin) | Verify completeness before wiring |
| `BankReconciliationService` | no | yes (3) | Statement/txn matching (no GL — correct) | Verify + wire |
| `BankService` | no | no | Bank account reads | Wire (read) |
| `TaxDeterminationService` / `TaxCalculationService` | no | no | Pure tax calc engine | Real; wire into posting if needed |
| `TaxAccountingService` | no | no | Tax posting computation | Verify |
| `TaxMasterService` | no | yes (1) | Tax-rate CRUD | Config service |
| `GstReportingService` | no | no | GSTR-1 / GSTR-3B from `TaxSnapshot[]` — **real but UNFED** (depends on TaxSnapshot rows that frozen posting may not create — Gap #4) | Verify data feed first |
| `BudgetService` / `BudgetVarianceService` | no | yes(3) / no | Budget CRUD + variance | Verify + wire |
| `FinancialControlsService` | no | no | Controls / segregation-of-duties | Verify |
| `SupplierBillService` | **yes (5)** | yes (5) | **DUPLICATES the frozen Procurement `SupplierBillApproved` posting path** — Gap #5 | **Quarantine — do NOT wire** |

### Category C — DEAD DUPLICATES (0 consumers, 0 posts, 0 writes; superseded by `FinancialReportingService`)
| Service | File | Superseded by |
|---|---|---|
| `TrialBalanceService` | trial-balance-service.ts | `FinancialReportingService.getTrialBalance` |
| `ProfitLossService` | profit-loss-service.ts | `FinancialReportingService.getProfitAndLoss` |
| `BalanceSheetService` | balance-sheet-service.ts | `FinancialReportingService.getBalanceSheet` |
| `CashFlowService` | cash-flow-service.ts | (no wired replacement — cash-flow statement is a genuine gap) |
> Recommendation: mark deprecated and remove (same treatment as the dead `processGoodsReceipt`), **after** confirming no dynamic import. No barrel re-exports them (verified).

---

## 3. UI wiring map (20 finance pages)
- **Wired to real services (4):** `accounting/trial-balance`, `statements/pnl`, `statements/balance-sheet`, `close/checklist` → `financial-reporting` + `period`.
- **Partially wired (1):** `statements/cash-flow` → `period` only (no cash-flow service — **gap**).
- **Mock (`_data/finance`) (2):** `close/history`, `treasury/reconciliation`.
- **No service import — direct-db or shell (13):** `accounting/{journals,ledger}`, `assets/{register,depreciation,movements}`, `close/periods`, `payables`, `receivables`, `treasury/{accounts,cash,forecast,ledger}`, `finance/page`.
- **Server actions:** only **2** (`recordCustomerPayment`, `recordSupplierPayment` in `finance.ts`). None for assets/tax/budget/close/reconciliation.

---

## 4. Key architectural findings & gaps (evidence-cited)

1. **Two disconnected period models.** Posting (`posting-engine.ts:22`) and `getCurrentPeriod` check **`AccountingPeriod`** (status OPEN/CLOSED/LOCKED). `PeriodCloseService` operates on **`FinancialPeriod`** (status OPEN/SOFT_CLOSED/HARD_CLOSED). **Closing a `FinancialPeriod` does not block posting.** Must reconcile before period-close can be claimed correct.
2. **Chart-of-accounts typing is unverified for 1200/2000/5000.** `ensureSalesLedgerAccounts` types only 4 accounts (1000/1100/4000/2100). Accounts 1200 (Inventory), 2000 (AP), 5000 (COGS) exist via the **seed** (posting throws if missing, yet frozen postings succeed → they exist). But **GL-balanced ≠ correctly typed** — if the seed mis-typed 2000 (AP) as DEBIT/ASSET, TB still balances by debit/credit sums but P&L/BS **misclassify**. **This is the #1 finance-runtime assertion.**
3. **No retained-earnings / closing entry.** Period close posts no journal; `getBalanceSheet` injects current-period P&L into equity dynamically. Fine for interim statements, not a true year-end close.
4. **GST reporting is unfed.** `GstReportingService` computes GSTR-1/3B from `TaxSnapshot[]`, but frozen invoice/bill posting likely does not create `TaxSnapshot` rows. Verify the feed before exposing GST returns.
5. **Duplicate supplier-bill posting.** `SupplierBillService` (posts 5 journals) duplicates the frozen Procurement `SupplierBillApproved` handler. It is dead; **keep it that way** — Procurement owns supplier-bill accounting.
6. **Asset → GL chain likely incomplete.** `AssetCapitalizationService`/`AssetDisposalService` write asset rows but show no GL posting; only `DepreciationEngine` posts. Verify the capitalize→depreciate→dispose journals before wiring the asset UI.
7. **Cash-flow statement missing** from the wired path (only the dead `CashFlowService`).

---

## 5. What the working finance spine is **today** (the verified core)
```
FinancialPostingService.postEntry (balanced, open-period)
        ↓
JournalEntry + JournalLine (by accountCode → LedgerAccount)
        ↓
FinancialReportingService → Trial Balance → P&L → Balance Sheet
```
The three frozen modules already drive this end (invoice/bill/payment/COGS/depreciation-free postings → GL balanced). So **TB should balance on live data today**; P&L/BS correctness hinges on Gap #2 (account typing). This is the spine `finance-runtime.ts` must lock down first.

---

## 6. Gap analysis → `finance-runtime.ts` assertion targets (Phase 2)
Deterministic assertions the harness must prove (mirrors sales/procurement/inventory runtime discipline), on a throwaway business or isolated postings, self-cleaning:

1. **Chart of accounts correctly typed** — every posted account (1000/1100/1200/2000/2100/4000/5000) has the right `accountType`+`normalBalance` (Gap #2).
2. **Journal posting** — balanced entry posts; unbalanced rejected; closed/missing period rejected.
3. **Ledger integrity** — Σ JournalLine.debit == Σ credit (GL balanced) business-wide.
4. **Trial Balance** — `isValid` true; Σ debit-normal == Σ credit-normal.
5. **P&L** — netProfit == Σrevenue − Σexpenses; ties to TB revenue/expense rows.
6. **Balance Sheet** — totalAssets == totalLiabilities + equity(incl. current P&L); the accounting equation holds.
7. **AR/AP reconciliation** — TB account 1100 == receivables subledger outstanding; 2000 == payables subledger outstanding.
8. **Depreciation** — `DepreciationEngine` posts a balanced DR Depreciation Expense / CR Accumulated Depreciation and writes the schedule; idempotent.
9. **Period close** — soft/hard close transitions; posting blocked appropriately (after Gap #1 reconciled); reopen path.
10. **Bank reconciliation** — statement/txn matching reconciles; unmatched blocks soft-close.
11. **Tax posting / GST** — Output/Input GST accounts reconcile; TaxSnapshot feed (after Gap #4).
12. **Opening/closing balances & retained earnings** — carry-forward correctness (after Gap #3 decision).

---

## 7. Recommended build sequence (respecting the frozen lifecycle)
1. **Phase 2 — `finance-runtime.ts`**: assert #1–#7 first (the verified spine: typing, posting, ledger, TB, P&L, BS, AR/AP tie-out). These require **no new services** — pure verification of what exists. Fix any bugs found (esp. Gap #2 account typing) as targeted corrections.
2. Extend to #8–#12 as each subsystem is verified/wired: depreciation → period close (reconcile Gap #1) → bank rec → tax/GST feed (Gap #4).
3. **Phase 4 — UI** (only after green): wire the 4 already-wired pages' siblings (journals, ledger, cash-flow, payables/receivables, assets, close, treasury) as **thin pages** over the verified services; replace the 2 `_data/` mock pages. No logic in React.
4. **Phase 5 — release**: `FINANCE_ARCHITECTURE_REVIEW.md`, `CAP_FINANCE_V1_RELEASE.md`, full regression (sales/procurement/inventory/wac/idempotency + finance), freeze.

---

## 8. Non-goals / do-not-touch
- **Do not rewrite** `FinancialPostingService` or `FinancialReportingService` — they are the canonical, wired core.
- **Do not wire** `SupplierBillService` (duplicate of frozen Procurement).
- **Do not modify** frozen Sales/Procurement/Inventory except verified bug fixes.
- **Remove** dead duplicates (`TrialBalance/ProfitLoss/BalanceSheet/CashFlowService`) only after confirming zero dynamic imports.
- Preserve DDD boundaries, RBAC (`finance.read`/`finance.write`), audit, multi-tenancy throughout.

---

## 9. Scope estimate (honest)
- **CAP-FINANCE V1.0 (achievable, mirrors prior freezes):** the accounting spine (posting, ledger, TB, P&L, BS, AR/AP tie-out) + period lifecycle + depreciation, verified by `finance-runtime` and exposed via thin UI. **Assertions #1–#9.**
- **Deferred to V1.1+ (documented limitations):** full GST returns pipeline (needs TaxSnapshot feed), cash-flow statement (indirect method), true year-end close with retained-earnings journals, budgets/variance UI, bank-feed integrations. These are real but larger; scoping them out of V1 keeps the freeze honest — exactly as Sales deferred credit notes and Procurement deferred requisition attribution.
