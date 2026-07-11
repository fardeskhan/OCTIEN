# COSMY ERP — Route Migration Report

**Date:** 2026-07-08
**Scope:** Consolidating the legacy `app/dashboard/*` tree into the canonical `app/(dashboard)/*` architecture.
**Rule honored:** *No route deleted until equivalent functionality exists in the canonical tree.*

Each step below was verified with `tsc --noEmit` (exit 0) and `next build` (exit 0).

---

## Step 1 — Auth Consolidation ✅ (complete, verified)

Migrated the four server-action modules that imported the **always-allow** stub
(`lib/auth/context.ts` → `{ businessId: 'mock' }`, `lib/auth/rbac.ts` → `requirePermission = () => true`)
onto the real `lib/server-auth.ts`:

| File | Before | After |
|---|---|---|
| `app/actions/finance.ts` | stub, no authz, `businessId='mock'` | `server-auth`, enforces `finance.write`, real tenant scope |
| `app/actions/procurement.ts` | stub | `server-auth`, enforces `finance.write` |
| `app/actions/payables.ts` | stub | `server-auth`, enforces `finance.write` |
| `app/actions/logistics.ts` | stub | `server-auth`, enforces `logistics.write` |

Supporting change: `lib/server-auth.ts#requireBusinessContext` now also returns real
`tenantId` (from `membership.business.tenantId`) and `userId` — **additively**, so existing
consumers (e.g. `inventory.ts`, which already destructured `tenantId`) stop receiving `undefined`.

> The stub files `lib/auth/context.ts` / `lib/auth/rbac.ts` are **not yet deleted** — they are still
> imported by the legacy finance pages listed under "Remaining work" and by `app/page.tsx`. They will
> be removed once those importers are migrated/retired (they carry no live risk now: the four real
> action modules no longer use them).

---

## Step 2 — Route Consolidation (in progress)

### 2a. Logistics module → canonical ✅ (complete, verified)

The entire `app/dashboard/logistics/*` module was **the only domain with no canonical
equivalent**, so it was relocated (not deleted) under the canonical operations group:

`app/dashboard/logistics/*` → `app/(dashboard)/operations/logistics/*`

New routes now served: `/operations/logistics`, `/operations/logistics/{runs,ewb,stops,transporters,exceptions}`.

- It now renders inside the real app shell (`components/layout/{sidebar,topbar}`) and inherits the
  `operations/layout.tsx` role gate `requireAnyRole(["Operations","Warehouse"])`.
- **Landing page** (`/operations/logistics/page.tsx`): real DB-backed (delivery-run / e-way-bill /
  transporter counts). Rewired from the stub to `server-auth` (`requirePermission("logistics.read")`);
  internal links updated `/dashboard/logistics/*` → `/operations/logistics/*`.
- **Sub-pages** (`runs`, `ewb`, `stops`, `transporters`, `exceptions`): client prototypes using **mock
  arrays**. Routes preserved; flagged for **Step 3 data wiring** to `app/actions/logistics.ts`.
- Removed a stray backup file `logistics/ewb/page.tsx.bak`.
- Added a **Logistics** entry to the canonical sidebar (`/operations/logistics`, permission `logistics.read`).

### 2b. Duplicate procurement dashboard 🗑️ (deleted, verified)

`app/dashboard/procurement/page.tsx` duplicated the canonical procurement module
(`app/(dashboard)/operations/procurement/**`, incl. a real `dashboard/page.tsx`). It also used an
off-system dark theme. Equivalent exists → **deleted**.

---

## Remaining work (next steps, not yet done)

These were deliberately deferred because they hinge on the **canonical-dashboard decision** and on
confirming canonical equivalents — each deserves its own verified pass.

### R-1. Root `/` collision + dashboard consolidation (Step 3)
`app/page.tsx` (stub-auth "Executive Dashboard", links into legacy finance) **and**
`app/(dashboard)/page.tsx` (real-auth dashboard) both resolve to `/`. Next 16 silently serves one.
**Recommendation:** keep `(dashboard)/page.tsx` as the sole `/`; rebuild the richer exec-dashboard
visuals onto it during the UI phase; delete `app/page.tsx` (also removes its stub import and its dead
`/dashboard/logistics/inventory` link).

### R-2. Finance AR/AP/cash legacy pages
Still in `app/dashboard/`:
- **Real, DB-backed:** `finance/page.tsx` (AR/AP/cash KPIs), `finance/cash/page.tsx` (cash ledger),
  `finance/invoices/page.tsx` (customer invoices/AR), `payables/page.tsx` (AP).
- **Mock prototypes:** `finance/receivables`, `finance/bills`, `finance/payables`.

**Before deleting any of these**, confirm canonical equivalents (candidates: `(dashboard)/sales/invoices`
for AR, `(dashboard)/finance/treasury/*` for cash). Real pages with no equivalent should be relocated
into a canonical `(dashboard)/finance/{receivables,payables}` section on `server-auth`; mock-only pages
should be rebuilt with real data, not carried over.

### R-3. `/dashboard` broken redirect + nav (after R-1)
`middleware.ts` redirects authenticated users to `/dashboard` (404) and the sidebar linked "Dashboard"
→ `/dashboard`. Once `/` is canonical (R-1), point both at `/`.

### R-4. Remove stub auth files
Delete `lib/auth/context.ts` and `lib/auth/rbac.ts` once R-1/R-2 remove their last importers.

### R-5. Remove `@ts-nocheck`
The migrated logistics landing and many pages still carry `@ts-nocheck`; strip and fix types as each
area stabilizes.
