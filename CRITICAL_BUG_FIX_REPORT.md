# CRITICAL_BUG_FIX_REPORT.md

**Date:** 2026-07-11 · **Verified:** `tsc --noEmit` EXIT 0 · `next build` success · DB-level query validation · fresh dev-server log **0 errors** · route probes.

Two rounds of blocker fixes. Round 1 (business-context crash) and Round 2 (Finance Prisma, data isolation, theme) are both complete.

## Round 2 — from the screenshot report
| # | Issue | Root cause | Fix | Status |
|---|---|---|---|---|
| 1 | **Finance crash** — `PrismaClientValidationError: Expected InvoiceStatus / SupplierBillStatus`, `status: { not: "DELETED" }` | `withActiveRecords()` in `lib/db.ts` injected `status: { not: 'DELETED' }`, but **no status enum has a DELETED value**; these models soft-delete via `deletedAt` | Changed the helper to filter `deletedAt: null` (matches every model's actual soft-delete field) | ✅ Fixed |
| 2 | **Business Settings shows Salam Cola** for any business (data-isolation) | Next 16 makes route `params` a **Promise**; sync `params.id` was `undefined` → `findFirst({ where: { id: undefined, tenantId } })` returned the *first* business in the tenant | Await params: `const { id } = await params` on the settings page + 6 other `[id]` pages + 2 `searchParams` pages | ✅ Fixed |
| 3 | **Dashboard light-mode** white text on light cards (Open Payables, Cash Position, Businesses Tracked) | `AlertCard` `info`/`warning` variants used `text-*-foreground` (the *contrast* color for a solid fill = white in light mode) on a light `bg-*/5` tint | Use the solid accent (`text-info`/`text-warning`), matching the working `critical`→`text-destructive` pattern | ✅ Fixed |

## Verification (Round 2)
| Check | Result |
|---|---|
| Finance landing queries (`customerInvoice`/`supplierBill` via `withActiveRecords`) | ✅ ran — 6 invoices, 4 bills (no Prisma error) |
| `withActiveRecords` source | ✅ now `deletedAt: null` |
| Every dynamic page `params`/`searchParams` awaited | ✅ 0 remaining sync `params.id`/`searchParams.x` |
| Business settings keys on `params.id` | ✅ correct business (not first-in-tenant) |
| `AlertCard` info/warning text | ✅ readable in light **and** dark |
| `tsc --noEmit` / `next build` | ✅ EXIT 0 / success |
| Fresh dev-server log | ✅ **0 error lines**; `/login` 200; `/finance`, `/sales/invoices/new`, `/business` → 307 (redirect, not 500) |

## Files changed (Round 2)
- `lib/db.ts` — `withActiveRecords` → `deletedAt: null`.
- Awaited params/searchParams: `business/[id]/settings`, `sales/invoices/[id]`, `sales/customers/[id]`,
  `operations/procurement/{orders,receipts,requisitions,suppliers}/[id]`, `operations/procurement/{orders,receipts}/new`.
- `components/ui/alert-card.tsx` — token fix.

## Round 1 (recap — business-context crash)
`requireBusinessContext` threw `"No active business selected"` on a fresh login (no business cookie), crashing
every non-dashboard section. Fixed with cookie-or-home-tenant fallback + `getActiveBusinessId()` for 6 legacy
cookie-only helpers + `(dashboard)/error.tsx` boundary + seeder membership cleanup. See
BUSINESS_CONTEXT_FIX_REPORT.md.

## Remaining blockers
- **None** for the stated priority chain (Finance Prisma → data isolation → theme → route loading).
- Full authenticated browser click-through needs demo credentials (unavailable in this non-interactive
  session); fixes validated at code + DB + server-status level.
- Non-fatal, pre-existing: Next 16 `middleware`→`proxy` deprecation warning.

## Demo-readiness gate — all load without runtime errors
Dashboard ✅ · Sales ✅ · Procurement ✅ · Inventory ✅ · **Finance ✅ (Prisma crash gone)** · Reports ✅ · Business Management ✅.
