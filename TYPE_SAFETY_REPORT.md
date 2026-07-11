# COSMY ERP — Type Safety Report (R-5 progress)

**Date:** 2026-07-08
**Gate status:** `tsc --noEmit` exit 0 · `next build` exit 0 (green throughout).

## Progress
| Metric | Start | Now |
|---|---|---|
| Files with `@ts-nocheck` | 101 | **1** |
| Files cleared | — | **100** |
| Real type errors resolved / neutralised | — | ~380 surfaced; 100 files worth cleared |

**100 of 101 `@ts-nocheck` directives removed (99%)** — the one remaining, `actions/procurement.ts`, is
blocked by the ODD-1 business decision, not a type problem. Build and typecheck green. **R-5 complete** —
see [TYPE_SAFETY_COMPLETION_REPORT.md](TYPE_SAFETY_COMPLETION_REPORT.md). Full inventory/method in
[TS_NOCHECK_AUDIT.md](TS_NOCHECK_AUDIT.md).

### Group D — Sales ✅ (8 cleared)
Fixed the 4 sales **actions** (`customer`, `quotation`, `sales-order`, `sales-return`); the 4 sales
**pages** (`customers/[id]`, `quotations`, `returns`, `dashboard`) then cleared automatically — their
errors were **downstream** of the actions' broken return types. Root causes fixed:
- **Unawaited `cookies()`** — Next 16 returns a Promise; made each `getBusinessId()` helper `async` and
  awaited all callers.
- **`withActiveRecords` misuse** — the helper blindly adds `deletedAt: null` and returns an
  index-signature type. Replaced with **inline, typed where-clauses**, adding `deletedAt: null` only for
  `Customer` (which has the column) and omitting it for `Quotation`/`SalesOrder`/`SalesReturn`/`Membership`
  (which don't). This restored relation-include inference (`.contacts`, `.salesOrders`, `.lines`,
  `membership.business`, etc.).
- Fixed stale `/dashboard/sales/*` revalidate/redirect paths → canonical `/sales/*`.

### Remaining: 4 files
`report.ts`, `fulfillment.ts` (Reporting/Fulfillment group), `inventory/warehouses` page, and
`procurement.ts` (**ODD-1** blocked). Clearing the first three leaves only the documented ODD-1 exception.

### ODD-2 resolved + schema health fix
The 4 procurement detail pages cleared after adding the approved `variant` relation and running
`prisma generate` — which surfaced and forced a fix for **41 pre-existing enum `@default("VALUE")`
validation errors** that had left the schema un-generatable (frontend was compiling against a stale
client). Both are documented in [OPEN_DOMAIN_DECISIONS.md](OPEN_DOMAIN_DECISIONS.md) (ODD-2) and
[PROCUREMENT_TYPE_REMEDIATION.md](PROCUREMENT_TYPE_REMEDIATION.md).

### Group C — Procurement ✅ (6 cleared, 4 blocked by ODD-2)
Cleared 5 actions + `suppliers/[id]` via **session-model migration** (`session.userId` → `session.user.id`),
**tenant id** from canonical context (`session.tenantId` → top-level `tenantId`), a void-returning inline
`"use server"` form action, and a stale `revalidatePath`. The 4 detail pages
(`orders/receipts/requisitions/[id]`, `receipts/new`) are blocked by **ODD-2** — the line models have a
`variantId` scalar but no `variant` relation. Details in
[PROCUREMENT_TYPE_REMEDIATION.md](PROCUREMENT_TYPE_REMEDIATION.md).

### Group A — Layout / navigation ✅ (done)
- **`components/ui/command.tsx` and `components/ui/popover.tsx` were stubs** (`() => null`), used only by
  `business-switcher`. Rather than build two primitives for one consumer, **rewrote `business-switcher`
  on the real `dropdown-menu`** (base-ui) and **deleted both stub files**.
- Added the same `asChild`→`render` shim to **`DropdownMenuTrigger`** (fixes `topbar` + `theme-toggle`);
  removed an invalid `forceMount` prop in `topbar`.
- `new-receipt-form`: added a `ReceiptLine` interface + typed `useState<ReceiptLine[]>` (killed the
  implicit-`any` callback params); fixed a stale `/dashboard/...` link.
- `ContextualIris`: corrected a broken relative import (`../../shared/...` → `@/shared/...`).

### Group B — Inventory stock dialogs ✅ (done)
The 4 dialogs (`Adjust/Receive/Reserve/TransferStockDialog`, ~100 of the 244 errors) were cleared by
fixing **two shared root causes** — no per-error patching:
- **`components/ui/form.tsx` was a one-line stub** (`export const Form = () => null; …`). Implemented the
  real, generically-typed shadcn form primitives (`Form`, `FormField`, `FormItem`, `FormLabel`,
  `FormControl`, `FormMessage`, `useFormField`) over `react-hook-form`. This alone cleared the bulk
  (`TS2559`/`TS2322`/`TS7031`) and is a reusable win for all future forms.
- **`DialogTrigger` didn't accept `asChild`** (the project uses `@base-ui/react`, which uses `render`).
  Added a shadcn-compat shim mapping `asChild` → base-ui `render`.
- Per-dialog: replaced `z.coerce.number()` (whose `unknown` input type fights RHF's resolver generics and
  the number `<input>`) with `z.number()` + `onChange={e => field.onChange(e.target.valueAsNumber)}`;
  removed a stray `({ field }: any)`.

## What was fixed (this pass, real fixes — not suppression)
- **67 files**: blanket-suppressed with no actual type error — directive removed outright
  (all `components/ui/*`, most `features/*` hooks, layouts, auth pages, the migrated finance/dashboard pages).
- `finance/receivables/page.tsx`: dropped `withActiveRecords` (it erased the `include` type), queried
  `customerInvoice` directly with `include: { customer: true }`, and **removed the `dueDate` overdue logic —
  `customerInvoice` has no `dueDate` field** (the overdue KPI was a latent bug). Replaced with real
  Paid/Total metrics.
- `actions/payables.ts`: fixed `bill.amount` (nonexistent) → `bill.totalAmount` on `supplierBill`.
- `components/layout/sidebar.tsx`: guarded `usePathname()` nullability (`?? ""`).

## Bug surfaced (needs follow-up, not papered over)
- `actions/procurement.ts` — `createSupplierBill` builds `SupplierBillLine` rows **without the required
  `account` (GL account)**. Typing the input surfaced that Prisma requires `account`; the code omits it,
  so line creation would fail at runtime. Left `@ts-nocheck` in place with an inline `KNOWN BUG` note
  until the correct GL-account assignment is decided. This is exactly the kind of defect the directive
  was hiding.

## Remaining 22 files (roadmap, grouped)
Fix order and per-file strategy are in [TS_NOCHECK_AUDIT.md](TS_NOCHECK_AUDIT.md). Summary:

- **Procurement `[id]` pages + actions (orders/receipts/requisitions, order/receipt/requisition/supplier)** —
  add the missing Prisma `include`s (`supplier`, `lines`, `currency`, `purchaseOrder`) and fix
  `include: { variant }` keys; type `.map`/`.reduce` callbacks; `session.userId` → `session.user.id`.
- **Sales (customers/[id], sales-order, sales-return, quotation, customer, returns/dashboard/quotations pages)** —
  same pattern: relation includes + typed callbacks.
- **Reporting/fulfillment actions** — type `aggregate`/`groupBy` results; `session.userId` → `session.user.id`.

## Guardrails honored
- No blanket `any`/`unknown` suppression introduced.
- Prisma-generated types and correct `include`s used instead of casts.
- Genuine bugs surfaced are fixed or explicitly flagged, never hidden.

## Recommendation
Continue R-5 group-by-group (inventory dialogs next — highest error density, likely one root cause),
keeping the gate green after each group, before starting Design System V2.
