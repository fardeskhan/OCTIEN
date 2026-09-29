-- ============================================================================
-- GL journal source uniqueness  (event-sourced postings = one journal per event)
-- Enforces one JournalEntry per (businessId, sourceType, sourceId) for event-
-- sourced postings, while EXEMPTING manual/adjustment journals (null sourceId).
--
-- PREPARED — NOT YET APPLIED. Do NOT run against production Neon until approved.
-- Do NOT use `prisma db push` (Prisma cannot express a partial index).
--
-- Readiness verified 2026-09-29 against live Neon:
--   * 0 duplicate (businessId, sourceType, sourceId) groups with non-null sourceId.
--   * Every event-sourced sourceType now keys by an event-unique id:
--       CUSTOMER_INVOICE=invoiceId, CUSTOMER_PAYMENT=payment.id,
--       SUPPLIER_BILL=billId, SUPPLIER_PAYMENT=payment.id,
--       SHIPMENT_DISPATCH=shipmentId, FIXED_ASSET_DEPRECIATION=schedule.id
--         (exactly one journal per schedule row; status!='PENDING' blocks re-post),
--       FIXED_ASSET_DISPOSAL=asset.id.
--   * MANUAL_JOURNAL / ADJUSTMENT_JOURNAL use null sourceId -> exempt.
--   * No conflict with existing indexes (businessId_idx, pkey,
--     sourceType_sourceId_idx non-unique).
-- ============================================================================

-- PRODUCTION: CONCURRENTLY (cannot run inside a transaction). Run over the
-- DIRECT (unpooled) Neon endpoint, not the -pooler host.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "journal_entries_business_source_unique"
  ON "journal_entries" ("businessId", "sourceType", "sourceId")
  WHERE "sourceId" IS NOT NULL;

-- Rollback / recovery:  DROP INDEX CONCURRENTLY IF EXISTS "journal_entries_business_source_unique";

-- ---------------------------------------------------------------------------
-- Pre-apply gate (re-run immediately before applying): must return 0 rows.
--   SELECT "businessId","sourceType","sourceId", COUNT(*)
--   FROM journal_entries WHERE "sourceId" IS NOT NULL
--   GROUP BY 1,2,3 HAVING COUNT(*) > 1;
-- ---------------------------------------------------------------------------
