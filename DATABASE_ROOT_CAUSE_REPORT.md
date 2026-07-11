# DATABASE_ROOT_CAUSE_REPORT.md

**Date:** 2026-07-11 · **Status:** Root cause proven, fixed, and validated (not theoretical — reproduced the exact error, applied the fix, re-ran the same command to green).

---

## 1. Root cause (PROVEN)

**Cause B — monorepo relative-path resolution.** Prisma resolves SQLite `file:` URLs **relative to the
`schema.prisma` directory** (`packages/database/prisma/`), *not* the current working directory. The repo-root
`.env` held a **root-relative** path:

```
# before
DATABASE_URL="file:./packages/database/prisma/dev.db"
```

When `prisma studio --schema packages/database/prisma/schema.prisma` runs from the repo root, Prisma loads
that value and prepends the schema directory, producing a **doubled, non-existent path**. Reproduced exactly:

```
$ echo "SELECT 1;" | npx prisma db execute --stdin --schema packages/database/prisma/schema.prisma
Error: SQLite database error
unable to open database file: packages\database\prisma\./packages/database/prisma/dev.db
```

That is the same "Error code 14: Unable to open the database file" Studio shows on first query. Studio *opens*
(schema parses fine) but *querying* fails because the query is the first thing that actually opens the DB file.

**Corroborating evidence** — the doubling had happened before: a fossil DB existed at the exact doubled depth
`packages/database/prisma/prisma/dev.db` (970 KB, Jul 4), created by an earlier run of the same broken path.

## Discovery findings (Phase 1)

- **Datasource:** `provider = "sqlite"`, `url = env("DATABASE_URL")`.
- **Three `.env` files defined DATABASE_URL, inconsistently:**
  | File | Value | Resolves (relative to schema dir) |
  |---|---|---|
  | `./.env` (root) | `file:./packages/database/prisma/dev.db` | ❌ doubled → missing (**the bug**) |
  | `./packages/database/.env` | `file:./dev.db` | ✅ `packages/database/prisma/dev.db` |
  | `./apps/frontend/.env` | `file:D:/cosmyerp/**cosmy-bos**/…` | ✅ works (Windows case-insensitive) but wrong case |
- **Physical DB files found (exact paths):**
  | Path | Size | Note |
  |---|---|---|
  | `packages/database/prisma/dev.db` | **675 MB** | ✅ the real DB (seeded, current) |
  | `packages/database/prisma/prisma/dev.db` | 970 KB | fossil from the path-doubling bug |
  | `packages/database/dev.db` | 0 bytes | empty stray |

## 2. Files changed

| File | Change |
|---|---|
| `./.env` | `DATABASE_URL` → `file:./dev.db` (schema-relative, correct) + explanatory comment |
| `./apps/frontend/.env` | fixed case `cosmy-bos` → `COSMY-BOS` in the absolute path |
| `packages/database/dev.db` | renamed → `dev.db.stray-0byte` (quarantined, non-destructive) |
| `packages/database/prisma/prisma/dev.db` | renamed → `dev.db.stray-doublenest` (quarantined) |
| *(reverted)* `packages/database/prisma/.env` | briefly added, then **removed** — Prisma 6 errors on a duplicate `DATABASE_URL` across `.env` files (even with identical values), which would block Studio |

**Prisma client regeneration:** not required — the client was already generated against this schema; the fault
was purely the env value, proven by the client querying successfully once the path resolved.

## 3. Exact fix

Make the root `.env` path **schema-relative** so Prisma's resolver lands on the real file:

```
# after  (packages/database/prisma/ + ./dev.db = packages/database/prisma/dev.db ✅)
DATABASE_URL="file:./dev.db"
```

## 4. Validation results (Phase 6)

| Check | Evidence |
|---|---|
| ✓ DB opens (Studio's path, no env set) | `prisma db execute --stdin` from root → **"Script executed successfully" EXIT 0** (was Error 14) |
| ✓ User table loads | client: owner exists = true, role = Owner |
| ✓ Business table loads | 34 rows |
| ✓ Membership table loads | 9 rows |
| ✓ AuditLog table loads | 12 rows |
| ✓ owner account exists | owner@cosmy.ai · tenant COSMY Group · emailVerified · memberships: Salam Cola [Owner/ACTIVE], COSMY UCO [Owner/ACTIVE], medical [Owner/SUSPENDED] |
| ✓ login succeeds | `POST /api/auth/sign-in/email` — **Owner@123 → 200**, CosmyDemo@2026 → 401, wrongpass → 401 |
| ✓ dashboard loads | `/` renders Group Dashboard with live figures (₹1.9 Cr revenue, ₹47 L profit) |
| ✓ no database errors | fresh dev server + queries: 0 DB errors |

## 5. Login credentials restored

- **Email:** `owner@cosmy.ai`  **Password:** `Owner@123`
- **Why it had failed:** *password was changed.* The account was never missing — while provisioning browser
  access earlier I overwrote the credential password with a different value; `Owner@123` no longer matched.
  (Not: deletion, membership loss, tenant mismatch, or provider mismatch — all were intact, per the inspection above.)
- **Recovery script:** `scripts/restore-owner.mjs` — idempotent, no duplicate owners. Ensures the user, an
  **Owner** role with **all permissions**, a membership to a default **active** business (Salam Cola), and sets
  the password. Re-runnable; `OWNER_PASSWORD` env overrides the default.
  ```
  DATABASE_URL="file:D:/cosmyerp/COSMY-BOS/packages/database/prisma/dev.db" node scripts/restore-owner.mjs
  ```
- **Hashing note:** Better Auth uses **scrypt** (`better-auth/crypto` `hashPassword`), **not bcrypt**. A bcrypt
  hash would not verify. The script uses Better Auth's own hasher (validated: sign-in returns 200).

## 6. Remaining risks

1. **Two `.env` files still define `DATABASE_URL`** (root + `packages/database/.env`), both now `file:./dev.db`.
   They don't collide in the tested scenarios (Prisma loads cwd + schema-dir `.env`, and these are never both
   loaded together), but if a future command loads both, Prisma will error on the duplicate. Safer long-term:
   keep `DATABASE_URL` in exactly one `.env` per run-context.
2. **`apps/frontend/.env` uses an absolute Windows path** — correct now, but not portable to another machine/OS.
   Consider a schema-relative value there too if the app is ever run elsewhere.
3. **DB size is 675 MB** — large for SQLite (legacy bulk/test rows from earlier phases). Consider a VACUUM or a
   fresh reseed before shipping.
4. **`BETTER_AUTH_URL=https://pilot.cosmy.ai`** in `apps/frontend/.env` while running on `localhost` — sign-in
   works, but this is a production URL; verify it's intended before a local demo, and rotate `Owner@123` +
   `BETTER_AUTH_SECRET` before any external exposure (both now appear in repo/docs).
5. **Schema drift** (columns added via `generate`+`ALTER`, no `prisma migrate` baseline) remains from prior
   phases — unrelated to this bug but still the top production risk.
```
