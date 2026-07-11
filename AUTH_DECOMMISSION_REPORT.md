# COSMY ERP — Auth Stub Decommission Report (R-4)

**Date:** 2026-07-08
**Goal:** Remove the always-allow authentication stubs and prove nothing depends on them.
**Verification:** `tsc --noEmit` exit 0 · `next build` exit 0 · repo-wide grep for `lib/auth/context`
and `lib/auth/rbac` → **no matches**.

---

## What was removed
| File | Behaviour (removed) |
|---|---|
| `src/lib/auth/context.ts` | `requireBusinessContext = () => ({ businessId: 'mock' })` — constant mock tenant, no session, no isolation |
| `src/lib/auth/rbac.ts` | `requirePermission = () => true` — authorized everything |

The now-empty `src/lib/auth/` directory was also removed.

## Canonical replacement
All authorization/tenant context flows through **`src/lib/server-auth.ts`**, which:
- verifies the Better Auth session (`getSession`);
- validates the user's `membership` against `(userId, businessId)` and derives real
  `tenantId` (`membership.business.tenantId`) and `userId`;
- enforces permissions (`requirePermission`) with a `SUPER_ADMIN` override, plus `requireRole` /
  `requireAnyRole`.

## Decommission timeline (how the last importers were removed)
1. **R-Step 1 (Auth Consolidation):** migrated the four server-action modules that used the stubs —
   `actions/finance.ts`, `actions/procurement.ts`, `actions/payables.ts`, `actions/logistics.ts` —
   to `server-auth`.
2. **R-Step 2a (Logistics migration):** the legacy logistics landing page moved to
   `(dashboard)/operations/logistics` and switched to `server-auth`.
3. **R-1 (Dashboard consolidation):** `app/page.tsx` (a stub importer) deleted.
4. **R-2 (Finance consolidation):** the remaining stub importers — the legacy
   `app/dashboard/finance/*` pages and `app/dashboard/payables` — were migrated to canonical
   `finance/*` pages on `server-auth`, then the entire `app/dashboard/` tree was deleted.
5. **R-4 (this step):** with zero importers left, both stub files were deleted.

## Proof of decommission
```
grep -r "lib/auth/context" src/  → (no matches)
grep -r "lib/auth/rbac"    src/  → (no matches)
```
Every server action and page now imports auth exclusively from `@/lib/server-auth`.

## Residual notes
- `middleware.ts` still performs a **presence-only** cookie check (documented in AUDIT_REPORT §C-3);
  real verification happens in `server-auth` at the layout/action layer. Hardening the middleware to
  verify the session is a recommended follow-up, but it is no longer backed by any always-allow stub.
- `@ts-nocheck` remains on several migrated pages; removal is tracked as **R-5**.
