# COSMY ERP — Procurement Type Remediation (R-5 Group C)

**Date:** 2026-07-09
**Gate:** `tsc --noEmit` exit 0 · `next build` exit 0.
**Scope:** Remove `@ts-nocheck` from procurement pages/actions, except documented blockers.

## Result
| Category | Files | Status |
|---|---|---|
| Actions cleared | 5 | ✅ `order`, `receipt`, `requisition`, `supplier`, `inventory` |
| Pages cleared | 5 | ✅ `suppliers/[id]`, `orders/[id]`, `receipts/[id]`, `requisitions/[id]`, `receipts/new` |
| Action blocked (ODD-1) | 1 | ⏸ `procurement.ts` |

**10 of 11 procurement files cleared.** ODD-2 was approved and resolved (see below); **ODD-1 is now the
only procurement exception**, as required.

## Fixes applied (real, no suppression)

### Session model migration (`session.userId` → `session.user.id`)
The canonical `requireBusinessContext` returns the Better Auth session whose user id is `session.user.id`
(there is no `session.userId`). Fixed across:
- `actions/inventory.ts` (6 sites), `actions/order.ts` (4), `actions/receipt.ts` (2),
  `actions/requisition.ts` (4), `actions/supplier.ts` (2).

### Tenant id from canonical context (`session.tenantId` → `tenantId`)
`session.tenantId` does not exist; `requireBusinessContext` now returns a real top-level `tenantId`.
Destructured and used it in `actions/order.ts` (`updatePurchaseOrderStatus`) and `actions/receipt.ts`
(`createGoodsReceiptRequest`).

### Form action returns void (`suppliers/[id]`)
`<form action={addSupplierContact}>` failed because the action returns a value while `action` expects
`void | Promise<void>`. Wrapped it in an inline `"use server"` action that awaits and discards the return.

### Stale revalidate paths
`actions/inventory.ts`: `revalidatePath("/dashboard/inventory")` → `/inventory` (canonical route).

## Remaining blockers

### ODD-2 — missing `variant` relation (4 pages) — ✅ RESOLVED
Added the `variant` relation to the three line models + back-relations on `ProductVariant` (additive).
Running `prisma generate` surfaced a **separate pre-existing blocker**: 41 enum fields used quoted
`@default("VALUE")` (Prisma 6.19 requires unquoted `@default(VALUE)`), which had made the schema
un-generatable — the frontend was compiling against a **stale** generated client. Fixed all 41 (only
Prisma's flagged lines), regenerated the client, and all 4 pages cleared with no page-code changes.

### ODD-1 — `SupplierBillLine.account` (`procurement.ts`)
Unchanged accounting-domain blocker from R-2. See ODD-1.

## Relation includes
No new `include`s were required for the cleared files — the fixes were session/tenant/form-action typing.
The blocked pages' includes are already correct **except** for the non-existent `variant` relation (ODD-2).

## Next
Once ODD-2 is approved and applied, the 4 detail pages clear with a single `prisma generate` and no further
edits. Then the remaining R-5 groups are **Sales**, then **Reporting/Fulfillment**.
