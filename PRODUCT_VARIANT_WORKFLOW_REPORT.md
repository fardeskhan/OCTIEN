# PRODUCT_VARIANT_WORKFLOW_REPORT.md

**Date:** 2026-07-11 · **Verified:** `tsc --noEmit` EXIT 0 · `next build` (both routes emit) · DB flow simulation.

## The bug
`createProduct` redirected to `/dashboard/products/{id}/variants` — a path that **does not exist**. The app's
routes live under the `(dashboard)` route group as `/inventory/products/...`, and there was **no variants
route at all**. Result: product created successfully, then **404**. Separately, `/inventory/products/[id]`
was a hardcoded mock (`useInventoryProduct('bus_aeterex_001', …)`), so "Open Product" was broken too.

## Fixes
| Area | Before | After |
|---|---|---|
| `createProduct` redirect | `/dashboard/products/{id}/variants` (404) | `/inventory/products/{id}/variants` (real) |
| `createProduct` revalidate | `/dashboard/products` | `/inventory/products` |
| `createVariant` revalidate | `/dashboard/products/{id}/variants` | `/inventory/products/{id}/variants` |
| Variants route | **missing** | **new** `/inventory/products/[id]/variants` (server + client manager) |
| Variant edit / delete | none | new `updateVariant`, `deleteVariant` actions (soft-delete, keeps ≥1 variant) |
| Product detail `[id]` | hardcoded mock business | **real server page** (variants, stock, inventory value) |
| New-product back link | `/dashboard/inventory/products` (404) | `/inventory/products` |

## Full workflow — now works end-to-end
```
Create Product (form: name, type, category, unit)
  → Save & Continue to Variants  (createProduct: creates product + a "Default" variant)
  → redirect → /inventory/products/{id}/variants   ← real page, NO 404
      → Add Variant (name, SKU auto/blank, unit, price, cost) → createVariant
      → Edit variant inline → updateVariant
      → Delete variant → deleteVariant (blocked if it's the last one)
Open Product (from list) → /inventory/products/{id} → real detail + "Manage Variants"
```

## Multi-tenant safety
Every variant action re-checks the product/variant belongs to the **active business**
(`requireBusinessContext` + `findFirst({ businessId })`) and is gated by `product.create` / `product.update`.

## Verification evidence
- Both routes emit in `next build` (`/inventory/products/[id]`, `/inventory/products/[id]/variants`).
- DB simulation: creating a product yields 1 default variant; the variants-page query returns the product +
  variant; redirect target resolves. Demo business has 2 units so the form is populated.
- `tsc --noEmit` EXIT 0.

## Audited surface
Product Create ✅ · Product Detail/Edit-of-variants ✅ · Variants page ✅ · Variant Create ✅ · Variant Edit ✅ ·
Variant Delete ✅ (with last-variant guard). No 404s in the flow.
