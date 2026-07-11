# COSMY ERP — Platform Audit Report

**Date:** 2026-07-08
**Scope:** `COSMY-BOS/` monorepo (focus: `apps/frontend`)
**Method:** Static inspection + real build/typecheck/lint runs against the actual code.

> **Important context correction.** The task brief describes a codebase that "does not build,"
> is full of "TypeScript errors," "broken pages," and should be "discarded and rebuilt from zero."
> The measured reality is different and is documented below. This report is grounded in what the
> code actually does, not the brief's assumptions. Recommendations are scoped accordingly.

---

## 0. Measured Baseline (ground truth)

| Check | Command | Result |
|---|---|---|
| TypeScript | `tsc -p apps/frontend --noEmit` | ✅ **Exit 0 (clean)** |
| Production build | `next build` | ✅ **Exit 0 — compiled in ~15s**, ~120 routes emitted |
| ESLint | `eslint .` | ❌ **281 errors, 148 warnings** (429 total) |

**Interpretation:** The application compiles and builds successfully today. It is *not* a broken
project. The debt is real but concentrated: lint hygiene, stubbed security primitives, duplicate
route trees, and static mock data standing in for live queries. This is a **stabilize-and-refactor**
situation, not a **rewrite-from-zero** one.

---

## 1. CRITICAL Issues

> **Correction to first-pass finding.** An initial scan suggested "RBAC/tenant isolation is entirely
> stubbed." Deeper tracing shows that is **not** true for the whole app. There are **two auth
> implementations**, and the split is the actual problem — see C-1.

### C-1. Two competing auth layers; a real one and an always-allow stub — and some real code uses the stub
There are two implementations of the same primitives:

- **Real:** `src/lib/server-auth.ts` — verifies the Better Auth session, validates the user's
  `membership` against `(userId, businessId)`, flattens role→permissions, honors a `SUPER_ADMIN`
  override, and exposes `requireRole`/`requireAnyRole`. This is genuine RBAC + tenant isolation.
- **Stub:** `src/lib/auth/rbac.ts` → `requirePermission = () => true` and
  `src/lib/auth/context.ts` → `requireBusinessContext = () => ({ businessId: 'mock' })`.
  Always authorizes; returns a constant `'mock'` business and `undefined` `tenantId`/`userId`.

Most server actions (`inventory`, `order`, `supplier`, `product`, `warehouse`, `requisition`,
`receipt`, `reference`, `customer`) correctly import the **real** layer. But **four live server
actions import the stub** — `app/actions/finance.ts`, `app/actions/procurement.ts`,
`app/actions/payables.ts`, `app/actions/logistics.ts` — so those domains run with **no authorization
and no tenant isolation**, writing against `businessId = 'mock'` with `tenantId`/`userId` undefined.
This is the true critical gap: a data-integrity + access-control hole in finance/AP/procurement/logistics.

**Fix:** migrate those four actions to `@/lib/server-auth` (adapting `requirePermission(userId, tenantId, perm)`
→ `requirePermission(perm)` and `{ businessId, tenantId, userId }` → `{ currentBusinessId, session, ... }`),
then delete `src/lib/auth/rbac.ts` and `src/lib/auth/context.ts`.

### C-2. Two overlapping applications share the same URL namespace
Both `src/app/page.tsx` and `src/app/(dashboard)/page.tsx` resolve to `/`. Next 16 emits a **single
`/` route without erroring** (older Next would reject this), so **which page serves `/` is undefined
and fragile**:

- `app/page.tsx` — a rich executive dashboard on the **stub** auth, whose KPI cards link into the
  **legacy** `/dashboard/finance/*` and `/dashboard/logistics/*` tree.
- `app/(dashboard)/page.tsx` — a different dashboard on the **real** auth, with the real shell
  (`components/layout/{sidebar,topbar}`), serving clean URLs (`/finance`, `/inventory`, `/sales`, …).

These are effectively two apps. One must be chosen canonical and the other retired. This is the
central de-duplication decision and should be made explicitly before mass edits.

### C-3. Middleware performs presence-only auth, not verification
`src/middleware.ts` only checks that a `better-auth.session_token` cookie *exists*; it does not verify
the session, and it redirects authenticated users to `/dashboard` (see H-5, a 404). Real verification
happens later in `(dashboard)/layout.tsx` via `server-auth`, so the middleware gate itself is weak but
not the sole line of defense for the real tree.

---

## 2. HIGH Priority Issues

### H-1. Duplicate route trees — legacy `app/dashboard/*` vs. current `app/(dashboard)/*`
Two parallel implementations exist:
- **Current** `app/(dashboard)/…` — deep, ~120 pages (finance, inventory, sales, procurement, governance, salam-cola, uco).
- **Legacy** `app/dashboard/…` — ~14 pages (finance, logistics, payables, procurement) at different URLs (`/dashboard/finance` vs `/finance`).

Both build and are routable, causing confusion, drift, and duplicated logistics/finance/procurement logic. The `app/dashboard/*` tree also carries most of the `@ts-nocheck` / `@ts-ignore` suppressions.

### H-2. Duplicate navigation system (one side is dead code)
- **Live shell:** `src/components/layout/{sidebar,topbar,business-switcher,theme-toggle}.tsx`, used by `(dashboard)/layout.tsx`.
- **Dead duplicate:** `src/shared/layouts/Sidebar.tsx` (imports `MAIN_NAVIGATION` from `src/shared/config/navigation.ts`). **Nothing imports `shared/layouts/Sidebar`**, and `MAIN_NAVIGATION` is used only by it → both are unreachable and safe to delete.
- **Not a duplicate (keep):** `src/shared/components/WorkspaceShell.tsx` + `WorkspaceRegistry.ts` are a live tabbed-workspace content component used by `features/sales/**` — different concern from the app shell.

Note the live `components/layout/sidebar.tsx` carries `@ts-nocheck`; removing that suppression should be part of the layout consolidation.

### H-3. Dashboards render static mock data, not live queries
`app/(dashboard)/_data/*.ts` (finance, governance, salam, uco, inventory, sales, procurement) are hardcoded datasets feeding the executive dashboards. These are placeholder dashboards — they are not wired to the substantial service layer in `src/lib/finance/**`, `src/lib/ar/**`, `src/lib/treasury/**`, etc.

### H-4. `@ts-nocheck` suppresses real type safety
`src/shared/layouts/Sidebar.tsx`, `src/components/layout/sidebar.tsx`, `app/page.tsx`,
`app/(dashboard)/page.tsx` and much of the legacy `app/dashboard/*` tree carry `@ts-nocheck`
(some files twice). The clean `tsc` result is therefore partly a suppression artifact; these must be
removed and the underlying types fixed as each area is refactored.

### H-5. Primary "Dashboard" nav link and post-login redirect point to a 404
`components/layout/sidebar.tsx` links "Dashboard" → `/dashboard`, and `middleware.ts` redirects
authenticated users on auth routes → `/dashboard`. There is **no `app/dashboard/page.tsx`** (only
sub-routes like `/dashboard/finance`), so `/dashboard` itself 404s. The real group dashboard lives at
`/`. The sidebar also links `/reports` and `/lumas`, which have no pages. These are live broken routes.

---

## 3. MEDIUM Issues

- **M-1. 281 ESLint errors**, dominated by `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars`. No `pnpm lint`/`typecheck` gate is wired (repo uses npm workspaces; frontend has only `dev/build/start/lint`, and `next lint` is removed in Next 16).
- **M-2. No `typecheck` script** in any `package.json`; the brief's `pnpm typecheck` / `pnpm lint` success criteria don't map to existing scripts.
- **M-3. Prisma schema lives in `packages/database/prisma/schema.prisma`** but the frontend imports `@prisma/client` directly — verify the client is generated against the intended schema and that DB access is centralized.
- **M-4. Sentry is a dependency** (`@sentry/nextjs`) — confirm it is actually initialized (client/server/edge configs) or remove it to avoid a false sense of monitoring coverage.
- **M-5. Stack version drift vs. brief.** Brief says Next.js 15; project is **Next 16.2.9 / React 19.2.4**. `apps/frontend/AGENTS.md` explicitly warns this Next version breaks from training-data assumptions — read `node_modules/next/dist/docs/` before changing routing/config.

## 4. LOW Issues

- **L-1. 148 lint warnings** (unused imports/vars) — safe cleanup, several auto-fixable.
- **L-2. Default Next.js boilerplate assets** remain (`public/next.svg`, `vercel.svg`, template `README.md`).
- **L-3. `next.config.ts` is empty** — no security headers, image config, or Sentry wrapping.

---

## 5. Recommended Refactors (priority order)

1. **Implement C-1/C-2/C-3 for real** — a genuine `requirePermission` backed by roles, a real `requireBusinessContext` reading the authenticated user's tenant/business, and session verification in middleware. This is the highest-value, highest-risk work.
2. **Delete the legacy `app/dashboard/*` tree** after confirming every capability exists in `app/(dashboard)/*`; consolidate to a single layout/nav system (retire one of the two shells).
3. **Wire dashboards to the service layer** — replace `_data/*.ts` with real queries through the finance/AR/treasury services.
4. **Add CI gates**: `typecheck` script + `eslint` in a pipeline; drive the 281 errors to zero, removing `@ts-nocheck`/`@ts-ignore` as you fix the underlying types.
5. **Confirm/finish observability** (Sentry init) and **harden `next.config.ts`** (secure headers).

---

## 6. What is NOT broken (do not rewrite)

- The ~120-page App Router structure builds and routes correctly.
- The domain/service layer under `src/lib/**` (finance posting, depreciation, tax, AR aging, reconciliation, period close) is substantial and coherent.
- The DDD packages (`packages/domain`, `packages/application`, `packages/infrastructure`) are real, not placeholders.
- Better Auth login/register/session wiring exists and functions.

A from-scratch rebuild would destroy this working surface. The correct path is **targeted stabilization + refactor**, sequenced by the priorities in §5.
