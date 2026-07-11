# COSMY ERP — `@ts-nocheck` Audit (R-5)

**Date:** 2026-07-08
**Method:** Stripped `// @ts-nocheck` from all files, ran `tsc --noEmit` against the real project,
grouped the resulting errors per file. Files that compiled clean had the directive removed permanently;
files that still errored had it restored to keep the build green while they are fixed group-by-group.

## Headline
| Metric | Value |
|---|---|
| Files that had `@ts-nocheck` | **101** |
| **Cleared for free** (no errors once removed) | **67** |
| Still need fixes (directive restored) | **34** |
| Total real type errors surfaced | **244** |

The 67 cleared files were mostly blanket-suppressed with no actual type problem (all 18 shadcn
`components/ui/*`, most `features/*` query/mutation hooks, layouts, auth pages, and the already-clean
migrated finance/dashboard pages).

## Error codes across the 34 remaining files
| Code | Count | Meaning | Typical real cause here |
|---|---|---|---|
| TS2559 | 73 | Type has no common properties | Wrong props passed to a component (inventory dialogs) |
| TS2322 | 52 | Not assignable | Server-action return types vs. form-action prop types |
| TS2339 | 40 | Property does not exist | Accessing a Prisma relation that was not `include`d |
| TS2551 | 31 | Property does not exist (did-you-mean) | `.customer`/`.supplier`/`.currency` vs `…Id` scalar |
| TS7006 | 22 | Parameter implicitly `any` | Untyped `.map`/`.reduce` callbacks |
| TS7031 | 13 | Binding element implicitly `any` | Destructured props without a type |
| TS2353 | 6 | Unknown object-literal property | Bad `include: { variant: … }` keys |
| TS2345 / TS18048 / TS18047 / TS2307 | 7 | Arg mismatch / nullability / missing module | Assorted |

## Remaining files by priority group (with fix strategy)

Groups follow the approved order. Verify `tsc` + `build` green after each group.

### A. Layout / navigation (shared shell)
| File | Errors | Recommended fix |
|---|---|---|
| `components/layout/business-switcher.tsx` | 9 | Type the businesses/props; use Prisma `Business` type |
| `components/layout/topbar.tsx` | 2 | Type `user`/`businesses` props |
| `components/layout/sidebar.tsx` | 1 | Type nav item / remove residual |
| `components/layout/theme-toggle.tsx` | 1 | Minor type/import |

### B. Shared components
| File | Errors | Recommended fix |
|---|---|---|
| `components/procurement/new-receipt-form.tsx` | 2 | Type form props / action signature |
| `features/ai/components/ContextualIris.tsx` | 1 | Minor type |
| `features/inventory/components/AdjustStockDialog.tsx` | 29 | Shared root cause — fix dialog prop/interface once |
| `features/inventory/components/ReceiveStockDialog.tsx` | 24 | Same pattern as above |
| `features/inventory/components/ReserveStockDialog.tsx` | 24 | Same pattern |
| `features/inventory/components/TransferStockDialog.tsx` | 23 | Same pattern |

### C/D. Finance
| File | Errors | Recommended fix |
|---|---|---|
| `app/(dashboard)/finance/receivables/page.tsx` | 3 | `customerInvoice` has **no `dueDate`** — remove overdue-by-dueDate logic |
| `app/actions/payables.ts` | 2 | Type Prisma results / nullable `bill.amount` |
| `app/actions/procurement.ts` | 1 | Minor type |

### E. Inventory
| File | Errors | Recommended fix |
|---|---|---|
| `app/actions/inventory.ts` | 6 | `session.userId` → `session.user.id`; type tx callbacks |
| `app/(dashboard)/inventory/warehouses/page.tsx` | 1 | `<form action>` expects void-returning action |

### F. Procurement
| File | Errors | Recommended fix |
|---|---|---|
| `app/(dashboard)/operations/procurement/orders/[id]/page.tsx` | 9 | Add `include` for `supplier`/`lines`/`currency`; fix `include: { variant }` key |
| `app/(dashboard)/operations/procurement/receipts/[id]/page.tsx` | 9 | Add `include` for `purchaseOrder`/`lines`; type `.map` |
| `app/(dashboard)/operations/procurement/requisitions/[id]/page.tsx` | 8 | Add `include` for `lines`; type `.reduce` |
| `app/actions/order.ts` | 5 | Type Prisma results / includes |
| `app/actions/requisition.ts` | 4 | Type results |
| `app/actions/receipt.ts` | 3 | Type results |
| `app/actions/supplier.ts` | 2 | `session.userId` → `session.user.id` |
| `app/(dashboard)/operations/procurement/receipts/new/page.tsx` | 1 | `include: { variant }` key |
| `app/(dashboard)/operations/procurement/suppliers/[id]/page.tsx` | 1 | Minor include/type |

### G/H. Sales, Fulfillment, Reporting (outside A–H; handled after governance-priority items)
| File | Errors | Recommended fix |
|---|---|---|
| `app/(dashboard)/sales/customers/[id]/page.tsx` | 19 | Add relation `include`s; type maps |
| `app/actions/sales-order.ts` | 16 | Type Prisma results / includes |
| `app/actions/fulfillment.ts` | 10 | Type results; `session.userId` → `session.user.id` |
| `app/actions/report.ts` | 10 | Type aggregate/groupBy results |
| `app/actions/sales-return.ts` | 7 | Type results |
| `app/actions/quotation.ts` | 4 | Type results |
| `app/actions/customer.ts` | 3 | Type results |
| `app/(dashboard)/sales/returns/page.tsx` | 2 | Type props |
| `app/(dashboard)/sales/dashboard/page.tsx` | 1 | Minor |
| `app/(dashboard)/sales/quotations/page.tsx` | 1 | Minor |

## Rules applied while fixing
- Prefer Prisma-generated types and correct `include`s over `any`.
- Add interfaces for component props; type callback parameters explicitly.
- Fix genuine bugs surfaced (missing includes, wrong field names, `session.userId`).
- No blanket `any`/`unknown` suppression.

Progress is tracked in **TYPE_SAFETY_REPORT.md**.
