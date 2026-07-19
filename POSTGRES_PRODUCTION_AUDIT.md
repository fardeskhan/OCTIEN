# POSTGRES / NEON PRODUCTION AUDIT — COSMY BOS ERP

**Date:** 2026-07-11 · **DB:** Neon PostgreSQL (pooler) · **Verified against the live Neon database** with the app running.

## Executive result
The reported failures — **"Forbidden: Requires permission sales.write"**, **"Requires role Sales"**,
**"No open period found"**, **"PostgreSQL connection: Closed"** — are **fixed at the root cause**. Every
previously-500 page now returns **200** with no permission/period/connection errors.

| Check | Before | After |
|---|---|---|
| `/sales/invoices/new`, `/finance`, `/procurement/suppliers`, `/inventory/products`, `/governance/security/permissions`, `/inventory/movements`, `/operations/logistics` | 500 (Forbidden) | **200 ✅** |
| Permission catalog on Neon | 0 permissions, 0 grants | **29 permissions, Owner granted all** |
| OPEN accounting periods | 1 business had **0** | **every business has an OPEN period** |
| Prisma clients | **7** (`new PrismaClient()` ×7) | **1 singleton** |
| Neon CRUD (create/read/update/delete) | — | **✅ all pass** |
| `next build` (Vercel command) | — | **✅ EXIT 0** |
| Fresh dev-server error log | many Forbidden/500 | **0 errors** |

---

## Root causes and fixes (each proven)

### 1. Empty permission catalog → every `requirePermission` failed
**Root cause:** the SQLite→Postgres migration copied business data but the **`permissions` (0) and
`rolePermissions` (0) tables were never seeded** on Neon. The main seeder only *reads* the catalog
(`db.permission.findMany()`); the catalog itself was originally created by a separate script that never ran on
Neon. With zero grants and the Owner role not being `SUPER_ADMIN`, `requirePermission` threw for everything.
**Fix (data):** `scripts/seed-permissions.mjs` — idempotent, non-destructive; creates the 29-permission
catalog and grants every Owner role all of them. Ran on Neon → 29 permissions, 29 grants.

### 2. Owner was not a super-admin + role-name casing mismatch
**Root cause:** `requirePermission`/`requireRole`/`requireAnyRole` bypassed only `SUPER_ADMIN`, not `Owner`. And
the migration left **two owner roles**: `Owner` (home tenant, now 29 perms) *and* `OWNER` (uppercase, foreign
tenant `tnt_demo_001`, 0 perms) — the COSMY UCO membership pointed at the uppercase one, so an exact-case
`=== "Owner"` check would also have missed it.
**Fix (code):** centralized `isSuperAdmin(role)` — **case-insensitive** `"owner" | "super_admin"` — used by all
three guards. Owner is now a legitimate super-admin (the only authorization bypass, as authorized), *and* it's
backed by real rolePermissions in the DB (defense in depth).

### 3. Tenant-isolation bug: membership using a foreign-tenant role
**Root cause:** the COSMY UCO membership (business in home tenant) referenced the `OWNER` role belonging to a
*different* tenant (`tnt_demo_001`).
**Fix (data):** `scripts/restore-owner.mjs` now repoints **every** membership of the owner to the correct
home-tenant Owner role (repointed 2). Also sets `Owner@123` and ensures the Owner role holds all permissions.

### 4. "No open period found" broke the dashboard
**Root cause:** the business **"COSMY ERP Demo" had 0 accounting periods**; the executive scorecard throws when
any business lacks an OPEN period.
**Fix (data + code):** `scripts/ensure-open-periods.mjs` creates a current-month OPEN period for any business
missing one (idempotent). Also hardened `dashboard-service.ts` to **fall back to the most recent period**
instead of throwing.

### 5. "PostgreSQL connection: Closed" / connection exhaustion
**Root cause:** **6 service modules each did `new PrismaClient()`** (dashboard, document, budget,
budget-variance, management-reporting, approval services) → 7 separate connection pools against Neon's limited
serverless connections.
**Fix (code):** all 6 now import the shared singleton from `@/lib/db`. The singleton itself was hardened to
cache the **extended** client across dev hot-reloads/warm invocations (was recreating the wrapper each reload).
Verified: 10 rapid sequential queries with no drop.

### 6. Leftover SQLite env
**Root cause:** `packages/database/.env` still held `file:./dev.db` — conflicts with the `postgresql` provider
if Prisma runs from that directory.
**Fix:** aligned it to the Neon `DATABASE_URL`.

---

## Phase coverage
- **P1 Audit / P2 DB validation:** 107 tables present on Neon; users/accounts/sessions/memberships/roles/
  permissions/businesses/tenant/accounting_periods/currencies/inventory/sales/purchase/finance all validated.
- **P4 Authorization:** Owner/Admin/Sales/Finance/Inventory/Procurement guards corrected; Owner bypass is the
  single legitimate exception; permissions are DB-backed, not hardcoded.
- **P5 Dashboard:** loads with real data (AR/AP/Net Cash/Trial Balance/scorecards); no open-period crash.
- **P6 CRUD:** create/read/update/delete verified on Neon.
- **P8 PostgreSQL raw SQL:** **the app contains no `$queryRaw`/`$executeRaw`** — pure Prisma ORM, so no
  SQLite-identifier/camelCase-quoting issues. (Only the seeder had one `ALTER TABLE`, now obsolete under
  Prisma-managed Postgres schema.)
- **P9 Performance:** Prisma singleton enforced; N+1-prone dashboard paths already batch via `Promise.all`.
- **P10 Vercel:** `prisma generate && next build` EXIT 0; `binaryTargets` include Neon/Vercel Linux; env comes
  from Vercel dashboard (see DEPLOYMENT_READINESS_REPORT.md).

## Files changed
```
 M apps/frontend/src/lib/server-auth.ts        case-insensitive Owner/super-admin bypass across all 3 guards
 M apps/frontend/src/lib/db.ts                  cache extended singleton (Neon connection stability)
 M apps/frontend/src/lib/dashboard/dashboard-service.ts        use singleton + period fallback (no crash)
 M apps/frontend/src/lib/documents/document-service.ts        use singleton
 M apps/frontend/src/lib/finance/budget-service.ts            use singleton
 M apps/frontend/src/lib/finance/budget-variance-service.ts   use singleton
 M apps/frontend/src/lib/finance/management-reporting-service.ts use singleton
 M apps/frontend/src/lib/workflows/approval-service.ts        use singleton
 M packages/database/.env                       sqlite leftover → Neon URL
 A scripts/seed-permissions.mjs                 idempotent 29-permission catalog + Owner grants
 A scripts/ensure-open-periods.mjs              guarantee OPEN period per business
 M scripts/restore-owner.mjs                    repoint all owner memberships to home Owner role
 A POSTGRES_PRODUCTION_AUDIT.md                 this report
```

## Remaining risks
1. **Two owner roles still exist** (`Owner` home tenant, `OWNER` foreign tenant/0-perms). No membership uses the
   stray one now; the case-insensitive bypass tolerates either. Consider deleting the orphan `OWNER` role for
   cleanliness (left in place to avoid touching another tenant's data blindly).
2. **No Prisma migration history** — the Neon schema was created via `db push`. Baseline with `prisma migrate`
   before iterating schema in production.
3. **Neon pooler + Prisma:** the pooled URL works; under heavy serverless concurrency, consider
   `@prisma/adapter-neon` or `connection_limit`/`pgbouncer=true` tuning.
4. **Lint** (168 pre-existing issues) and **2 `@ts-nocheck` files** remain (non-blocking; see
   DEPLOYMENT_READINESS_REPORT.md).

**Login:** `owner@cosmy.ai` / `Owner@123` (Neon). Rotate before external exposure.
