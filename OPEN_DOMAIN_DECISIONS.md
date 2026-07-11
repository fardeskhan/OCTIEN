# COSMY ERP — Open Domain Decisions

Tracked business/accounting decisions that block clean code changes. These must be answered by a
domain owner; they should **not** be resolved by inventing defaults in code.

---

## ODD-1 — `SupplierBillLine.account` (GL account) is required but never set

**Surfaced by:** R-5 (`@ts-nocheck` removal) in `app/actions/procurement.ts` → `createSupplierBill`.

**Problem:** Prisma requires `account` on `SupplierBillLine`, but `createSupplierBill` creates lines
without it. Line creation would fail at runtime, and the choice of account directly affects financial
postings — so it cannot be guessed.

**Questions for the domain owner:**
1. Should the GL account be selected **per line** (user picks at data entry)?
2. Should the **supplier category** map to a default expense account?
3. Should **procurement settings** provide a fallback/clearing account?

**Do NOT:** hardcode `accountId: "DEFAULT_ACCOUNT"` or pick an arbitrary expense account without a rule.

**Status:** BLOCKING removal of `@ts-nocheck` from `app/actions/procurement.ts`. The file carries an
inline `KNOWN BUG` note. Once the rule is decided, implement it and remove the directive.

---

## ODD-2 — Missing `variant` relation on procurement line models

**Surfaced by:** R-5 Group C (Procurement) in the detail pages
`operations/procurement/{orders,requisitions,receipts}/[id]/page.tsx` and `receipts/new/page.tsx`.

**Problem:** `PurchaseOrderLine`, `GoodsReceiptLine`, and `PurchaseRequisitionLine` each have a
`variantId` **scalar** but **no `variant` relation** in `schema.prisma`. The pages do
`include: { lines: { include: { variant: { include: { product: true } } } } }` and render
`line.variant.product.name` — referencing a relation that doesn't exist. (`GoodsReceiptRequest.purchaseOrder`
*does* exist; those errors were collateral from the invalid `variant` include breaking type inference.)

**Recommended fix (technical, low-ambiguity — needs approval because it changes the shared schema):**
Add the relation to each line model (the `variantId` column already exists, so this is **additive** — no
column change), plus back-relations on `ProductVariant`:
```prisma
// on each *Line model
variant  ProductVariant  @relation(fields: [variantId], references: [id])
// on ProductVariant
purchaseOrderLines        PurchaseOrderLine[]
goodsReceiptLines         GoodsReceiptLine[]
purchaseRequisitionLines  PurchaseRequisitionLine[]
```
Then run `prisma generate`. This unblocks all 4 pages with **no page-code changes** (their existing
includes become valid).

**Why not done unilaterally:** `schema.prisma` lives in `packages/database` and is shared with the NestJS
backend; a shared-schema change (and a future `prisma migrate` to add the FK constraints) warrants explicit
sign-off, consistent with how other cross-cutting decisions were handled.

**Alternative (no schema change):** fetch variants separately per page
(`db.productVariant.findMany({ where: { id: { in: variantIds } }, include: { product: true } })`) and map
by id. Fully type-safe and frontend-only, but adds page code and diverges from the intended model.

---

## BACKLOG — AUTH_CONSISTENCY_REVIEW (not an R-5 blocker)

**Surfaced by:** R-5 Groups D–E (Sales, Reporting, Fulfillment).

**Problem:** several server actions read business context **directly from cookies** via a local
`getBusinessId()` (`cookies().get("current_business_id")`) instead of the canonical
`requireBusinessContext()`, and **skip permission/role checks**. Examples: `getQuotations`,
`getSalesOrders`, `getSalesReturns`, `createQuotation`, sales-order mutations, and the reporting actions.
This bypasses tenant validation and RBAC that `server-auth` enforces.

**Action (audit + migrate):**
- Replace cookie-derived context with `requireBusinessContext()` in **sales**, **reporting**, and
  **fulfillment** actions.
- Add `requirePermission(...)` / `requireRole(...)` where writes/reads need authorization.
- Verify tenant enforcement, permission enforcement, and role enforcement end-to-end.

**Status:** Backlog. Not a type-safety issue (R-5 left the auth flow unchanged); it is a
security/consistency gap to close before production.

---

## ODD-2 (below) — RESOLVED

**Status:** ✅ **RESOLVED (2026-07-09).** Approved and implemented: added the `variant` relation to the
three line models + back-relations on `ProductVariant` (additive; no column change). Regenerating the
client surfaced a **separate pre-existing blocker** — the schema had **41 enum fields with quoted
`@default("VALUE")`** that Prisma 6.19 rejects (must be unquoted `@default(VALUE)`), which had made the
whole schema un-generatable/un-migratable. Fixed all 41 (targeting only Prisma's flagged lines; 3
legitimate String defaults left quoted), then `prisma generate` succeeded and all 4 detail pages cleared.
See the note below.

> **Schema health note:** before this fix, `prisma generate` failed with 41 validation errors, meaning the
> Prisma client could not be regenerated and migrations could not run. The working frontend was compiling
> against a **stale** generated client. This is now fixed; the schema validates and generates cleanly.
> (Also observed: the datasource `provider` is `sqlite`, not PostgreSQL as the original brief stated —
> worth confirming for production.)
