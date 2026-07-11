# COSMY ERP — Dashboard Migration Report (R-1)

**Date:** 2026-07-08
**Goal:** One root dashboard, one auth model, no route collision, no mock-data dependency.
**Verification:** `next build` exit 0 (single `/` route) · `tsc --noEmit` exit 0.

---

## Starting state (two competing root dashboards)

- `app/page.tsx` — "Executive Dashboard" on the **stub** auth (`requireBusinessContext` →
  `businessId:'mock'`), linking into the legacy `/dashboard/*` tree.
- `app/(dashboard)/page.tsx` — a **broken merged file** containing **two** `export default`
  functions and **two** `export const dynamic`: a hardcoded-mock `DashboardPage` concatenated with
  the real `GroupDashboardPage`.

Both resolved to `/`; Next 16 silently served one. This was the core collision.

## What was done

### 1. Canonical root rewritten — `app/(dashboard)/page.tsx`
Rewritten to a single, clean server component (no `@ts-nocheck`, one default export):

- **Real auth + tenant context:** `getSession()` from `server-auth`; tenant derived from the
  authenticated user's `User.tenantId` (robust — does not depend on the business-selection cookie).
- **Real data:** KPIs (Revenue, Net Profit, Cash, Net Working Capital) and the **Business Unit
  Comparison** are computed from the genuine per-business `scorecard`
  (`DashboardService.getBusinessScorecard` → live financial figures). The previous synthetic
  `revenue * 0.7 / 0.3` business splits and the mock fallback numbers were removed.
- **Real chart:** the fake random 30-day cash-flow area chart was replaced with a real
  **Revenue vs. Net Profit by Business** bar chart driven by the scorecard.
- **Honest empty states:** when no business has posted data yet, the page shows an explicit empty
  state instead of fabricated numbers.
- Kept the canonical layout/shell/provider tree and the design-system components
  (`WorkspaceLayout`, `KPICard`, `AlertCard`, `BusinessComparisonCard`, `StandardBarChart`).

### 2. Removed mock data from the group fetcher
`app/(dashboard)/_data/dashboard-fetchers.ts#getGroupDashboardData` no longer generates the fake
random `cashFlowData`; it returns only the real `{ scorecard }`.

### 3. Deleted the duplicate root
`app/page.tsx` removed → `/` now resolves solely to `app/(dashboard)/page.tsx`. This also removed one
importer of the always-allow `lib/auth/context` stub.

### 4. Fixed dashboard navigation + login redirects
| Location | Before | After |
|---|---|---|
| `middleware.ts` (post-auth redirect) | `/dashboard` (404) | `/` |
| `components/layout/sidebar.tsx` ("Dashboard" link + active check) | `/dashboard` | `/` |
| `(auth)/login/page.tsx` (`router.push`) | `/dashboard` | `/` |
| `(auth)/register/page.tsx` (`router.push`) | `/dashboard` | `/` |
| `actions/{supplier,requisition,receipt,order}.ts` (`revalidatePath` + `redirect`) | `/dashboard/procurement/*` | `/operations/procurement/*` |
| `(dashboard)/operations/procurement/receipts/new/page.tsx` | `/dashboard/operations/procurement/orders` (double prefix) | `/operations/procurement/orders` |

## Success criteria

| Criterion | Status |
|---|---|
| One dashboard architecture | ✅ canonical `(dashboard)` only |
| One root route | ✅ single `/` in build output |
| One auth model | ✅ `server-auth` (session + real tenant) |
| No route collisions | ✅ collision removed |
| No mock dashboard data on the root path | ✅ real scorecard; fake cash-flow + fallback numbers removed |
| Build passes | ✅ exit 0 |
| Typecheck passes | ✅ exit 0 |

## Notes / follow-ups

- `DashboardService` instantiates its **own** `new PrismaClient()` and requires an **open accounting
  period** per business (throws otherwise; caught per-business in the scorecard loop). Recommend
  switching it to the shared `db` singleton and returning zeros instead of throwing — tracked for the
  finance pass (R-2).
- Richer executive **exception cards** (overdue AR/AP, compliance failures, pending approvals) were
  intentionally *not* fabricated. They need a real group-level exceptions service; the current row
  shows real position metrics (Open AR, Open AP, Cash, businesses tracked) until that exists.
- Two **pre-existing broken redirects** unrelated to this consolidation remain and target routes that
  exist in neither tree — flagged, not guessed:
  - `actions/product.ts` → `/dashboard/products/${id}/variants`
  - `actions/fulfillment.ts` → `/dashboard/fulfillment/shipments/${id}`
