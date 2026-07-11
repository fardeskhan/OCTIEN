# COMPONENT_AUDIT_REPORT_FINAL.md

**Date:** 2026-07-11 · **Scope:** every shared component category — real vs. placeholder, light/dark parity.

| Category | Component(s) | Behavior | Status |
|---|---|---|---|
| **Tables** | `DataTable` | search, status filter, sort, pagination, multi-select, record count | ✅ functional |
| | plain `<table>` (finance/logistics/inventory) | server-rendered real data, empty states | ✅ |
| **Forms** | business, invoice-create, customer-create, variant, supplier/product/PO/receipt new | controlled inputs → server action → toast → redirect; **persist to DB** | ✅ |
| **Cards** | `Card`, `KPICard`, `AlertCard` | theme tokens; **AlertCard light-mode text fixed** | ✅ |
| **Charts** | `StandardBarChart` (Recharts), dashboard aging bars, **`RouteMap` (SVG)** | render real data | ✅ |
| **Dialogs** | `Dialog`, `DropdownMenu` (base-ui + render shim) | switcher, menus, confirm | ✅ |
| **Drawers** | `EntityDrawer` | products/customers/suppliers detail | ✅ |
| **Tabs** | drawer tabs, finance sections | ✅ (single-tab where only summary exists) |
| **Filters** | DataTable toolbar | ✅ real |
| | `FilterBar` (legacy) | decorative | ⚠️ **removed from real pages**; remains on mock pages |
| **Invoice templates** | Standard / Corporate / Minimal | pure render; logo, GST tax summary, T&C, signature | ✅ |
| **Map** | `RouteMap` | **real SVG plot of stop coordinates** (distance, sequence, status legend) | ✅ self-contained |

## Placeholder / decorative components (off core path)
- `FilterBar` chips on still-mock pages (governance/UCO/Salam-Cola).
- Legacy `RouteMapPanel` ("geospatial in a future update") — **superseded** by the new `RouteMap` on the
  logistics control tower.
- Mock inventory `ReceiveStock/Reserve/Transfer/AdjustStock` dialogs on legacy product-workspace paths
  (the real product detail page replaced the hardcoded workspace).

## Light / dark parity
- Shell (sidebar/topbar/content), tables, cards, KPI/alert cards, badges, forms all use **theme tokens**.
- **Fixed:** `AlertCard` info/warning text (was white-on-light). No `text-white` on light backgrounds remains
  in dashboard components (audited by grep).

## Architecture notes (swap points)
- **Map:** `RouteMap` prop contract is renderer-agnostic → mapcn/maplibre can replace the SVG without touching
  logistics pages.
- **E-Way:** `EWayBillProvider` (Mock now, NIC later) — actions never call NIC directly.
- **Invoice templates:** registry-based; a client's template is one new file + one registry line.

## Remaining
Wire `FilterBar`→`DataTable` on mock pages as they become real; replace `RouteMap` SVG with mapcn tiles when a
tile provider is approved (external network / CSP consideration).
