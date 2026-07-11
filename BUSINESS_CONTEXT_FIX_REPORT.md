# BUSINESS_CONTEXT_FIX_REPORT.md

**Date:** 2026-07-11 · **Severity:** Blocker (every section except the group dashboard crashed).
**Verified:** `tsc --noEmit` EXIT 0 · `next build` success · DB-level resolver validation · dev-server route probes.

## Root cause
`requireBusinessContext()` (`src/lib/server-auth.ts`) **threw** `"No active business selected"` whenever the
`current_business_id` / `current_membership_id` cookies were absent. Those cookies are only set by
`switchBusiness()`. So on a fresh login — before the user ever opened the switcher — **every page that calls
`requireBusinessContext` crashed** (Finance, Sales, Procurement, Inventory, Reports, Business Management).
The group dashboard (`/`) survived because it reads `getSession()` + `user.tenantId` directly and never calls
`requireBusinessContext`.

A **second source** of the same crash: five server-action files and `/sales/dashboard` had their own
cookie-only `getBusinessId()` that threw `"No business context selected"` (customer, quotation, sales-order,
sales-return, report).

## The fix (graceful fallback, never crash)
`requireBusinessContext` now resolves the active business in priority order:
1. **Valid cookie** → use that business/membership.
2. **No / stale cookie** → fall back to the user's first membership **in their home tenant** (so the default
   matches the group dashboard), else any membership.
3. **No memberships at all** → throws a typed `NoBusinessAccessError` (handled by the error boundary, below).

Added `getActiveBusinessId()` (delegates to the resolver) and routed the six legacy `getBusinessId()` sites
through it, deleting their ad-hoc throws.

## Business-context initialization (auto-select)
- **Single business** → auto-selected (fallback resolves it). **Multiple** → resolves the home-tenant
  business and the topbar switcher lets the user change it (which persists the cookie via `switchBusiness`).
- Seeder cleanup: removed the demo user's stray membership to a non-group test business
  (**"Aeterex Holdings"**), so the no-cookie fallback and switcher only ever surface **Salam Cola** and
  **COSMY UCO**.

## Verification
| Check | Result |
|---|---|
| Fixed resolver returns a business with no cookie | ✅ → **Salam Cola**, 29 permissions, tenantId set |
| Switcher membership list | ✅ Salam Cola, COSMY UCO (Aeterex removed) |
| Remaining `throw "No … business …"` sites | ✅ 0 (only a doc comment) |
| `tsc --noEmit` / `next build` | ✅ EXIT 0 / success |
| `/login` renders | ✅ 200 |
| `/finance`, `/sales`, `/inventory`, `/operations/procurement/suppliers` (unauth) | ✅ 307 redirect (not 500) |
| Fresh dev-server log | ✅ 0 error lines |

## Belt-and-suspenders
Added `(dashboard)/error.tsx` — a segment error boundary that renders a friendly **"Select a business /
Try again / Manage Businesses"** screen instead of a raw crash for any residual error.

**Result:** no dashboard section throws a fatal business-context error anymore; the app degrades gracefully.
