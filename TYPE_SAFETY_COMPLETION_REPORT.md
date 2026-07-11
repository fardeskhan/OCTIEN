# COSMY ERP — Type Safety Completion Report (R-5)

**Date:** 2026-07-10
**Outcome:** `@ts-nocheck` reduced from **101 files → 1**. The single remaining file is blocked by a
documented business decision (ODD-1), not by a type problem.
**Gates:** `tsc --noEmit` exit 0 · `next build` exit 0 · `prisma generate` exit 0.

---

## Metrics
| Metric | Value |
|---|---|
| Starting `@ts-nocheck` files | **101** |
| Cleared | **100 / 101 (99%)** |
| Remaining | **1** — `app/actions/procurement.ts` (ODD-1) |
| Real type errors surfaced & resolved | ~380 across all groups |
| New suppressions added | **0** |
| `any`-casts used as suppression | **0** |
| ESLint-disable / rule-off used | **0** |

## Method
Data-driven, not blanket edits: strip the directive, run `tsc` for the **real** error surface, restore
only where genuine errors remained, then fix by priority group with a green gate after each. 67 of the
101 files had *no* actual error (blanket-suppressed) and were cleared for free; the rest were fixed by
root cause.

## Major fixes by group
| Group | What was fixed |
|---|---|
| **Auth migration** | 4 server-action modules moved off always-allow stubs to `server-auth`; `session.userId` → `session.user.id` and `session.tenantId` → canonical `tenantId` across inventory/order/receipt/requisition/supplier/fulfillment. |
| **Finance** | Real `withActiveRecords` fix on `customerInvoice`; `bill.amount` → `bill.totalAmount`; removed a bogus `dueDate` overdue metric (`customerInvoice` has no `dueDate`). |
| **Inventory dialogs** | `components/ui/form.tsx` was a `() => null` stub — implemented the real typed shadcn form primitives; added an `asChild`→`render` shim to `DialogTrigger`; `z.coerce.number()` → `z.number()` + `valueAsNumber`. ~100 errors cleared via 2 shared fixes. |
| **Layout / nav** | `command.tsx` / `popover.tsx` were stubs — rewrote `business-switcher` on the real `dropdown-menu` and deleted both; `asChild` shim on `DropdownMenuTrigger`; removed invalid `forceMount`. |
| **ODD-2 schema relations** | Added the missing `variant` relation to the 3 procurement line models + back-relations on `ProductVariant` — cleared 4 detail pages with no page-code changes. |
| **Prisma regeneration restored** | Fixed **41 enum `@default("VALUE")`** validation errors that had made the schema un-generatable (frontend was on a stale client). Added the missing data columns to `ExecutiveDashboardProjection`. `prisma generate` now succeeds. |
| **Sales** | Fixed 4 actions (await `cookies()`; replaced type-unsafe `withActiveRecords` with inline typed where-clauses); 4 pages cleared downstream automatically. |
| **Reporting / Fulfillment** | Same session/tenant/`cookies()`/where-clause fixes; projection columns added; aggregate nullability guarded. |
| **Hook stabilization** (RC5.0A) | Quoted the unquoted `${CLAUDE_PLUGIN_ROOT}` path in the `agentforce-adlc` hooks so writes/Bash stop false-failing. |

## Latent bugs surfaced (not hidden)
`@ts-nocheck` had been masking real defects, now fixed or documented:
- Un-included Prisma relations accessed at runtime (`.customer`, `.lines`, `.supplier`, `membership.business`).
- Wrong field names (`bill.amount`, `session.userId`, `session.tenantId`, `customerInvoice.dueDate`).
- Unawaited `cookies()` (Next 16 returns a Promise).
- A schema that could not `generate`/`migrate` at all (41 enum defaults).
- A reporting projection model missing all its data columns.
- **ODD-1:** `createSupplierBill` creates `SupplierBillLine` rows without the required `account`.

## The one remaining file — `app/actions/procurement.ts` (ODD-1)
Kept suppressed **by design**. Its `createSupplierBill` omits the required `SupplierBillLine.account`
(GL account). This is a business rule, not a type fix — do **not** invent a default.

**Open question (needs a domain owner):** how is `SupplierBillLine.account` chosen?
- selected manually per line?
- derived from supplier category?
- derived from the inventory item?
- a procurement default/clearing account?

Once answered, implement it and remove the last `@ts-nocheck`.

## Follow-ups
- **DB migration pending:** the schema now has new columns/relations (`variant` FKs, projection columns).
  `prisma generate` updated the *types*; a controlled `prisma migrate` is still needed to apply the DB
  constraints/columns. See [SCHEMA_REMEDIATION_REPORT.md](SCHEMA_REMEDIATION_REPORT.md).
- **AUTH_CONSISTENCY_REVIEW** (backlog, see [OPEN_DOMAIN_DECISIONS.md](OPEN_DOMAIN_DECISIONS.md)): several
  sales/reporting/fulfillment actions read business context straight from cookies and skip permission
  checks — replace with `requireBusinessContext()`.
- **Next up:** R-6 Lint Cleanup (281 errors), then Design System V2.
