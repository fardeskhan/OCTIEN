-- ============================================================================
-- Customer payment idempotency key  (Step 2 — retry identity)
-- Adds a dedicated, nullable idempotency key to customer_payments and enforces
-- one payment per (businessId, idempotencyKey) via a PARTIAL unique index, so
-- legacy rows with a NULL key remain valid and unconstrained.
--
-- REVIEW-ONLY ARTIFACT. Do NOT apply to production Neon until approved.
-- Do NOT use `prisma db push` for this — Prisma cannot express a partial index.
--
-- The `reference` column is user-facing (cheque no. etc.) and is left untouched.
-- ============================================================================

-- 1) Additive, nullable column (safe: all existing rows become NULL).
ALTER TABLE "customer_payments"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" text;

-- 2) Partial unique index: uniqueness only when a key is present.
--    PRODUCTION: run CONCURRENTLY (cannot run inside a transaction) to avoid an
--    exclusive lock on the table:
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "customer_payments_business_idempotency_key"
  ON "customer_payments" ("businessId", "idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

-- (No separate non-unique index: the partial UNIQUE index above already serves the
--  (businessId, idempotencyKey) lookup, so a mirror @@index would be redundant.)

-- ---------------------------------------------------------------------------
-- TEST VARIANT (for a disposable / rollback validation only): the CONCURRENTLY
-- form cannot run inside a transaction, so the pre-production validation uses a
-- plain (non-concurrent) unique index inside BEGIN/ROLLBACK:
--
--   BEGIN;
--   ALTER TABLE "customer_payments" ADD COLUMN "idempotencyKey" text;
--   CREATE UNIQUE INDEX "customer_payments_business_idempotency_key"
--     ON "customer_payments" ("businessId","idempotencyKey")
--     WHERE "idempotencyKey" IS NOT NULL;
--   -- run idempotency scenarios --
--   ROLLBACK;
-- ---------------------------------------------------------------------------
