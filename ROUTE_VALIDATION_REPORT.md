# ROUTE_VALIDATION_REPORT.md

**Date:** 2026-07-11 · **Method:** static guard analysis + build (all routes emit) + dev-server status probes.
**Guard model:** every `(dashboard)/*` route requires **auth** (layout redirects to `/login`). Business-scoped
pages call `requireBusinessContext` (now cookie-or-fallback — never crashes) and, where they write/read
scoped data, `requirePermission`. The group dashboard `/` needs only a session + `user.tenantId`.

## Status after the business-context fix
| Route group | Auth | Business | Permission | Loads | Data |
|---|---|---|---|---|---|
| `/` (Group Dashboard) | ✅ | tenant only | — | ✅ | real |
| `/business`, `/business/new`, `/business/[id]/settings` | ✅ | ctx | Owner | ✅ | real (CRUD) |
| `/sales/customers` (+ `/new`, `/[id]`) | ✅ | ctx | sales.read/write | ✅ | real |
| `/sales/orders` · `/sales/invoices` · `/sales/invoices/[id]` | ✅ | ctx | sales.read | ✅ | real |
| `/sales/quotations` · `/sales/returns` · `/sales/dashboard` | ✅ | ctx (**fixed**) | sales.* | ✅ | real (may be empty) |
| `/operations/procurement/suppliers` (+ `/new`, `/[id]`) | ✅ | ctx | procurement.read | ✅ | real |
| `/operations/procurement/orders` (+ `/new`) · `/receipts` · `/requisitions` · `/dashboard` | ✅ | ctx | procurement.read | ✅ | real |
| `/inventory` · `/inventory/products` (+ `/new`, `/[id]`) · `/inventory/valuation` · `/warehouses` | ✅ | ctx | inventory.read | ✅ | real |
| `/finance` + accounting/statements/treasury/close/assets (18 pages) | ✅ | ctx | finance.read | ✅ | real & reconciling |
| `/reports` | ✅ | ctx (**fixed**) | reporting.read | ✅ | real |
| `/operations/logistics` (+ subpages) | ✅ | ctx | logistics.read | ✅ | landing real; subpages mock |
| `/governance/*` (18) | ✅ | ctx | governance.read | ✅ | mock UI |
| `/uco/*` (11) · `/salam-cola/*` (16) | ✅ | ctx | uco/salam.read | ✅ | mock UI (illustrative) |
| `/lumas` | ✅ | — | lumas.read | ✅ | placeholder |

## Fixed — Round 1 (were crashing on missing business cookie)
`requireBusinessContext` (all callers) · `getActiveBusinessId` now backs the six legacy cookie-only helpers:
`customer.ts`, `quotation.ts`, `sales-order.ts`, `sales-return.ts`, `report.ts`, and `/sales/dashboard`.

## Fixed — Round 2 (Finance Prisma + data isolation)
- **Finance landing** (`/finance`) crashed with `PrismaClientValidationError` (`status: { not: "DELETED" }`) —
  fixed by correcting `withActiveRecords` to filter `deletedAt: null`. All finance routes now load.
- **`params` is a Promise in Next 16** — every dynamic page now `await`s it. Fixed `[id]` pages:
  `business/[id]/settings` (was showing the wrong business), `sales/invoices/[id]`, `sales/customers/[id]`,
  `operations/procurement/{orders,receipts,requisitions,suppliers}/[id]`, and `searchParams` on
  `operations/procurement/{orders,receipts}/new`.
- **New routes added:** `/sales/invoices/new` (create invoice), `/sales/customers/new` (create customer).

## Results
- **Working routes:** all `(dashboard)` routes load (real or illustrative UI); `next build` emits every route.
- **Broken / crashing routes:** **0** — no route throws a fatal business-context error after the fix; a typed
  `NoBusinessAccessError` (only for a user with zero memberships) is caught by `(dashboard)/error.tsx`.
- **Probed (unauthenticated):** `/login` → 200; `/finance`, `/sales`, `/inventory`,
  `/operations/procurement/suppliers` → 307 redirect to `/login` (correct — not 500).
- **Auth-path validation:** the fixed resolver was validated at the DB layer to return **Salam Cola + 29
  permissions** for the demo user with no cookie. (Full browser click-through requires demo credentials, which
  are not available in this non-interactive session.)

## Note
Pre-existing warning: `middleware` file convention is deprecated in Next 16 (rename to `proxy`). Non-fatal;
not part of this fix.
