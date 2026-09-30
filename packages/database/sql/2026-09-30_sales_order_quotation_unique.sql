-- ============================================================================
-- Quotation -> Sales Order conversion idempotency (SALES quote convert)
-- Adds a nullable sales_orders.quotationId and enforces one sales order per
-- (businessId, quotationId) via a PARTIAL unique index, so an accepted quotation
-- can produce AT MOST ONE sales order even under concurrent conversion requests.
--
-- PREPARED - NOT YET APPLIED. Do NOT run against production Neon until approved.
-- Do NOT use `prisma db push` (Prisma cannot express a partial index).
-- ============================================================================

-- 1) Additive, nullable column (existing/direct orders keep NULL, exempt below).
ALTER TABLE "sales_orders"
  ADD COLUMN IF NOT EXISTS "quotationId" text;

-- 2) Partial unique index: at most one SO per quotation when linked.
--    PRODUCTION: CONCURRENTLY (outside a transaction, over the DIRECT/unpooled endpoint).
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "sales_orders_business_quotation_unique"
  ON "sales_orders" ("businessId", "quotationId")
  WHERE "quotationId" IS NOT NULL;

-- Rollback / recovery:
--   DROP INDEX CONCURRENTLY IF EXISTS "sales_orders_business_quotation_unique";
--   ALTER TABLE "sales_orders" DROP COLUMN IF EXISTS "quotationId";

-- Pre-apply gate (must return 0): existing duplicate links (none can exist — column is new).
--   SELECT "businessId","quotationId",COUNT(*) FROM sales_orders
--   WHERE "quotationId" IS NOT NULL GROUP BY 1,2 HAVING COUNT(*)>1;
