# DEPLOYMENT READINESS REPORT — COSMY BOS ERP → Vercel

**Date:** 2026-07-11 · **Scope:** minimal, safe, production-grade fixes only. No feature rewrites, no schema-data changes, `strict` untouched, no `any`/`@ts-ignore` added.

---

## Status summary

| Gate | Result | Notes |
|---|---|---|
| **Build (`prisma generate && next build`)** | ✅ **PASS** | EXIT 0 — client generates, Next compiles, all routes emit |
| **TypeScript (`tsc --noEmit`)** | ✅ **PASS** | EXIT 0 (fixed 1 tooling-mangled file; strict stays on) |
| **Prisma** | ✅ **PASS** | Client generates; Vercel Linux engine target added |
| **Next.js 16** | ✅ **PASS** | App Router, Server/Client boundaries, Route Handlers, Node runtime — all valid |
| **Lint (`eslint`)** | ⚠️ **NOT PASSING** (non-blocking) | 168 pre-existing errors (mostly `no-explicit-any`, unused vars). **Next 16 does not run ESLint in `next build`**, so this does **not** block Vercel deploy |
| **Vercel Ready** | ❌ **NO — one blocker: the database** | Everything builds and is configured; **SQLite cannot run on Vercel serverless** (ephemeral, read-only FS). Provision Postgres to go live (steps below) |

**Bottom line:** the app **builds and is Vercel-configured**. The single thing preventing a live production deploy is the **SQLite datasource** — a serverless platform has no persistent writable local file. This requires a hosted Postgres DB (a decision + provisioning only you can do), not a code fix.

---

## Files changed (with root cause + why safe)

### 1. `apps/frontend/src/app/(dashboard)/_data/dashboard-analytics.ts`
- **Problem:** `tsc` errors — `Cannot find name 'bucketize'` (×2) and `RecentDoc` missing `amount`/`when`. **This would fail the Vercel build** (`next.config` does not ignore type errors).
- **Root cause:** an automated "TS-hardening" pass had moved the module-level `bucketize()` *inside* `getActivityAndDocs` (so `getGroupAnalytics` could no longer see it) and rewrote the `docs` builder with hand-written inline types that dropped `amount`/`when` and referenced a non-existent `customerName`.
- **Fix:** moved `bucketize` back to module scope; restored the `docs` builder to read `customer.name`/`supplier.name` from the Prisma `include`s and include `amount`/`when`; let Prisma infer the callback types (no hand-written shapes, no `any`).
- **Why safe:** restores the exact previously-working behavior and exported API; types are Prisma-inferred; strict-clean.

### 2. `apps/frontend/package.json`
- **Problem:** no `prisma generate` in install/build → Prisma Client absent on Vercel's fresh install → runtime "Client did not initialize". No `type-check` script (your validation calls `npm run type-check`).
- **Fix:** `build` → `prisma generate --schema=../../packages/database/prisma/schema.prisma && next build`; added `postinstall` (same generate) and `type-check: tsc --noEmit`; pinned `engines.node >= 20.9.0`.
- **Why safe:** additive scripts only; generation is idempotent; the `../../` schema path resolves on Vercel (repo is fully checked out; Root Directory = `apps/frontend`).

### 3. `packages/database/prisma/schema.prisma` (generator block only)
- **Problem:** default generator emits only the `native` query engine; Vercel's serverless runtime is Linux (Amazon Linux 2) — risk of "query engine binary not found" at runtime.
- **Fix:** `binaryTargets = ["native", "rhel-openssl-3.0.x"]`. **Data model unchanged.**
- **Why safe:** generator-only config; adds an engine binary, never alters tables/columns; regenerated locally (EXIT 0) — native still works for local dev.

*(No `.vercelignore` needed: `.gitignore` already excludes `*.db`, `dev.db`, and all `.env*`; `dev.db` is untracked, so Vercel never uploads the 675 MB file or secrets.)*

---

## Phase-by-phase audit results

**P1 Build audit:** only real build-breaker was the type error above (fixed). No missing braces/returns, no invalid module scope, no circular-import build failures.
**P2 TypeScript:** strict stays on; the one file's typing is corrected with proper inference. Pre-existing `@ts-nocheck` (2 files) and `any` (47) remain as **flagged tech debt** — untouched to honor "don't rewrite working code"; they don't block the build.
**P3 Structural:** server/client boundaries valid (client components carry `"use client"`; `window`/Leaflet only in client + `ssr:false`).
**P4 Next.js 16:** App Router ✅, Metadata API ✅, Route Handlers ✅, **no `runtime = "edge"` anywhere** → all Prisma/Node code runs on the Node runtime (Vercel-safe). Middleware imports only `next/server` (Edge-safe, no Prisma). *Note: `middleware.ts` works but Next 16 prints a deprecation notice suggesting `proxy` — non-blocking; left as-is to avoid behavior risk.*
**P5 Prisma:** imports/generation valid; `Decimal` handled via `.toNumber()`; enums used correctly; `include/select` typed. Client regenerates clean.
**P6 Vercel readiness:** build output ✅; env vars must be set in Vercel dashboard (`.env` isn't deployed); Server Actions on Node runtime ✅. **Blocker = SQLite datasource.**
**P7 Refactor:** limited to the single broken file; no broad refactors (per "minimal safe fixes").

---

## THE blocker → going live on Vercel (exact steps)

SQLite is local-file-only; Vercel serverless can't use it. Move to Postgres (Vercel Postgres / Neon / Supabase):

1. Provision a Postgres DB; copy its connection string.
2. In `packages/database/prisma/schema.prisma`: `datasource db { provider = "postgresql" … }`.
3. In Vercel → Project → Settings → Environment Variables, set:
   - `DATABASE_URL` = the Postgres URL
   - `BETTER_AUTH_SECRET` = a strong secret · `BETTER_AUTH_URL` = your Vercel URL
4. Create the schema on Postgres: `npx prisma migrate deploy` (or `prisma db push` to baseline, since no migration history exists yet — see "remaining risks").
5. Seed: `node scripts/seed-cosmy-demo.mjs` then `node scripts/restore-owner.mjs` against the Postgres `DATABASE_URL`.
6. Vercel → New Project → Root Directory = `apps/frontend`; deploy (build command already runs `prisma generate && next build`).

**Local dev is intentionally left on SQLite so your current workflow keeps working** — only the provider line + Vercel env change is needed to switch.

## Remaining risks
1. **No Prisma migration history** — schema has drifted via `generate`+`ALTER` (SQLite). For Postgres, baseline with `prisma migrate` before relying on `migrate deploy`; the seeder's SQLite-specific `ALTER TABLE … ADD COLUMN` guards should be reviewed for Postgres.
2. **Lint** — 168 pre-existing issues; non-blocking for build but worth a dedicated cleanup pass (mostly `no-explicit-any` in `types/*` and a few unused vars).
3. **`@ts-nocheck` (2 files)** — hide type-checking in those files; safe today but latent risk.
4. **`middleware.ts`** — migrate to `proxy` convention before a future Next major.
5. **Secrets** — rotate `BETTER_AUTH_SECRET` and the demo `Owner@123` before production; never commit real env values.

---

## Modified files (git-style summary)
```
 M apps/frontend/package.json                                   (+build/postinstall/type-check scripts, engines)
 M apps/frontend/src/app/(dashboard)/_data/dashboard-analytics.ts  (fix scope + RecentDoc typing → tsc green)
 M packages/database/prisma/schema.prisma                       (generator binaryTargets only; data model unchanged)
 A DEPLOYMENT_READINESS_REPORT.md                               (this report)
```

## Final validation (run locally, this pass)
```
npx prisma generate           → ✅ Generated Prisma Client v6.19.3 (native + rhel-openssl-3.0.x)
npm run type-check            → ✅ EXIT 0
npm run build                 → ✅ prisma generate + next build, EXIT 0, all routes emitted
npm run lint                  → ⚠️ 168 pre-existing issues (non-blocking for Vercel build)
```
