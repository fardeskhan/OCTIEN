# COSMY ERP — Finance Consolidation Report (R-2)

**Date:** 2026-07-08
**Goal:** Consolidate all finance functionality into the canonical `(dashboard)/finance/*` tree,
migrate real DB-backed pages, drop mock prototypes, and default currency to INR (₹).
**Verification:** `next build` exit 0 · `tsc --noEmit` exit 0 · **no `/dashboard/*` routes remain** ·
**no `lib/auth/*` imports remain**.

---

## Canonical finance structure (now)
```
finance
├ accounting        (existing: journals, ledger, trial-balance)
├ treasury          (existing: cash, accounts, forecast, reconciliation) + ledger (migrated)
├ assets            (existing: register, depreciation, movements)
├ receivables       ← NEW (real)
├ payables          ← NEW (real)
├ statements        (existing: pnl, balance-sheet, cash-flow)
└ close             (existing: checklist, history, periods)
```

## Migrations (real DB-backed → canonical, on `server-auth`, INR)

| Legacy (deleted) | Canonical (new/updated) | Data |
|---|---|---|
| `app/dashboard/finance/page.tsx` | `(dashboard)/finance/page.tsx` (rewritten) | Real AR/AP/cash KPIs + outstanding invoices/bills + section nav |
| `app/dashboard/finance/invoices` | `(dashboard)/finance/receivables` | Real `customerInvoice` (AR), aging/overdue summary |
| `app/dashboard/payables` | `(dashboard)/finance/payables` | Real `payableEntry` + `supplierBill` (AP) |
| `app/dashboard/finance/cash` | `(dashboard)/finance/treasury/ledger` | Real `cashTransaction` ledger |

All four migrated pages now:
- authenticate through `@/lib/server-auth` (`requireBusinessContext` + `requirePermission("finance.read")`), inheriting the `finance/layout.tsx` role gate `["Finance","Auditor"]`;
- format money with the new `@/lib/currency` `formatINR` (₹), replacing the previous `$` displays;
- use the on-system `WorkspaceLayout` + `KPICard`/`Card` components (the legacy AP page's off-system dark theme was dropped).

## Deletions — mock prototypes (rule: do not migrate mock data)
Deleted, no real equivalent to preserve; to be rebuilt on real services during the design phase:
- `app/dashboard/finance/receivables` (mock `Receivable[]`)
- `app/dashboard/finance/bills` (mock `Bill[]`)
- `app/dashboard/finance/payables` (mock `Payable[]` — distinct from the real top-level `payables` page, which was migrated)

The **entire** `app/dashboard/` legacy tree is now removed.

## Currency (INR default)
- New shared util `src/lib/currency.ts`: `formatINR` (₹ grouped, en-IN) and `formatINRCompact` (₹ Cr/L/K).
- Applied to: the root dashboard (`(dashboard)/page.tsx`) and all migrated finance views (finance landing, receivables, payables, treasury/ledger).
- **Follow-up (tracked):** the remaining `$` displays live only in **mock** finance pages that read from `_data/finance` (`accounting/ledger`, `accounting/trial-balance`, `treasury/cash`, `treasury/reconciliation`, `assets/register`, `assets/movements`, `assets/depreciation`). These are prototype pages pending real-data wiring; their currency will convert to ₹ as part of that mock-removal/design pass rather than churn soon-to-be-rewritten files.

## Navigation
- The finance landing is now a real hub linking to every section (Accounting, Treasury, Assets, Receivables, Payables, Statements, Period Close) — all targets verified to exist.
- Stale `revalidatePath`/redirect paths (`/dashboard/procurement/*`, `/dashboard/inventory`) fixed to canonical (`/operations/procurement/*`, `/inventory`).

## R-2 verification gates
| Gate | Status |
|---|---|
| typecheck passes | ✅ |
| build passes | ✅ |
| No legacy auth imports remain | ✅ (`lib/auth/*` deleted) |
| No duplicate finance routes remain | ✅ (`/dashboard/*` gone) |
| No broken navigation | ✅ finance hub + redirects verified |
