# COSMY ERP — Prisma Schema Remediation Report

**Date:** 2026-07-09
**Trigger:** Resolving ODD-2 (missing `variant` relation) required `prisma generate`, which exposed that
the schema did not validate at all.
**File:** `packages/database/prisma/schema.prisma` (shared by the Next.js frontend and the NestJS backend).

---

## Executive summary
`prisma generate` and `prisma migrate` were **completely broken** — the schema failed validation with 41
errors. The functioning frontend was compiling against a **stale, previously-generated** Prisma client, so
the breakage was invisible until a schema change was attempted. This report documents the fix that restored
schema validation and client generation, plus the additive relations that resolved ODD-2.

## Before → after
| Check | Before | After |
|---|---|---|
| `prisma validate` / `generate` | ❌ 41 validation errors | ✅ generates cleanly (v6.19.3) |
| `prisma migrate` | ❌ blocked (schema invalid) | ✅ unblocked (schema valid) |
| Frontend Prisma client | stale (out of sync with schema) | freshly regenerated |
| ODD-2 procurement relations | absent | present + real types |
| Frontend `tsc` / `next build` | green (against stale client) | green (against fresh client) |

---

## Fix 1 — 41 enum `@default` validation errors
**Problem:** enum-typed fields declared their default as a **quoted string**, e.g.
```prisma
status  ComplianceJobStatus  @default("PENDING")   // ❌ Prisma 6 rejects
```
Prisma 6.19 requires the **unquoted enum member**:
```prisma
status  ComplianceJobStatus  @default(PENDING)     // ✅
```

**Action:** unquoted the default on exactly the 41 lines Prisma flagged (using its own error output as the
source of truth). The 3 remaining quoted `@default("…")` values are legitimate **String** defaults (not
enums) and were intentionally left quoted.

**Flagged lines fixed (41):** 426, 427, 470, 511, 512, 547, 579, 620, 707, 708, 762, 798, 839, 887, 951,
952, 1000, 1021, 1059, 1106, 1125, 1177, 1195, 1217, 1335, 1366, 1394, 1395, 1457, 1470, 1480, 1559, 1650,
1682, 1699, 1729, 1756, 1757, 1789, 1803, 1831.

These span enums including `ComplianceJobStatus`, `ApprovalStatus`, and other workflow/status enums.

## Fix 2 — ODD-2 procurement `variant` relations (additive)
The line models carried a `variantId` **scalar** but no `variant` **relation**. Added:
```prisma
// PurchaseOrderLine, GoodsReceiptLine, PurchaseRequisitionLine
variant  ProductVariant  @relation(fields: [variantId], references: [id])

// ProductVariant (back-relations)
purchaseOrderLines        PurchaseOrderLine[]
goodsReceiptLines         GoodsReceiptLine[]
purchaseRequisitionLines  PurchaseRequisitionLine[]
```
Additive only — the `variantId` columns already exist, so **no column changes**. This turned the
procurement detail pages' `include: { variant … }` and `line.variant.product.name` into real, typed access
(resolving ODD-2 with no page-code changes).

## Fix 3 — `ExecutiveDashboardProjection` missing data columns (additive)
The reporting projection model held only `id` / `businessId` / dates, but `actions/report.ts` writes
`totalInventoryVal`, `openPOAmount`, `activeSuppliers`, `pendingReceipts` to it. Added those (plus
`monthlySpend`, `lowStockAlerts` for a consistent read shape) as defaulted columns and regenerated.

## Verification
- `prisma generate` → ✅ `Generated Prisma Client (v6.19.3)` (~1s).
- Frontend `tsc --noEmit` → ✅ exit 0.
- Frontend `next build` → ✅ exit 0 (procurement `[id]` routes emit normally).

---

## Follow-ups / risks to confirm
- **Datasource provider is `sqlite`**, not PostgreSQL as the original brief stated
  (`datasource db { provider = "sqlite" }`). Confirm the intended production database; this affects
  migrations, types (e.g. `Decimal`/`Json` behavior), and deployment.
- **A migration should be created** to add the new `variant` foreign-key constraints at the database level
  (`prisma migrate dev`). Generation alone updated the client types; the DB constraint is a separate step
  and should be run in a controlled environment (verify no orphan `variantId` values first).
- The stale-client situation implies **client generation was not part of the build/CI**. Recommend adding
  `prisma generate` to the install/build pipeline so the client can never drift from the schema again.
