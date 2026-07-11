# COMPONENT_AUDIT_REPORT.md

**Date:** 2026-07-11 · **Scope:** shared UI components and their real vs. decorative behavior.

## Shared components — status
| Component | Behavior | Status |
|---|---|---|
| `DataTable` | global search, auto status-filter dropdown, record count, sorting, pagination, multi-select | ✅ fully functional |
| `FilterBar` | decorative search/date chips (no wiring) | ⚠️ **removed** from all 7 core lists; still imported by some mock pages |
| `KPICard` | display, theme tokens, `variant` (success/warning/destructive) | ✅ |
| `AlertCard` | display; **light-mode text fixed** (was white-on-light for info/warning) | ✅ fixed |
| `Card` / `Badge` / `Progress` | theme-token based | ✅ |
| `Button` | base-ui; `variant`/`size`; use `buttonVariants()` for link-buttons (no `asChild`) | ✅ |
| `EntityDrawer` | opens/closes, KPIs, tabs, actions | ✅ (products/customers/suppliers) |
| `FinancialStatementTable` | expandable rows, currency `₹`, subtotals/totals | ✅ (P&L, Balance Sheet, Cash Flow) |
| `Dialog` / `DropdownMenu` | base-ui with `render` (asChild shim) | ✅ (switcher, menus) |
| `RouteMapPanel` | placeholder map ("geospatial integration in a future update") | ⚠️ placeholder (logistics) |
| Invoice templates (Standard/Corporate/Minimal) | pure render of `InvoiceDocument`+`BrandingConfig`; logo, GST tax summary, terms, signature | ✅ |
| Forms (`business-form`, `invoice-create-form`, `customer-create-form`, supplier/product/PO new) | controlled inputs, submit → server action, toasts, redirect | ✅ persist to DB |

## Modals / forms
- Create Business / Edit Business / Create Customer / Create Invoice / Create Supplier / Create PO / New
  Receipt: **save works** (server actions persist; validated by DB counts). 
- Invoice **Mark Paid**: updates invoice + receivable ledger.
- No blocking modal with a dead "Save" remains on the core path.

## Known decorative/placeholder components (off core path)
- `FilterBar` chips on mock pages (uco/salam-cola/governance/logistics).
- `RouteMapPanel` geospatial map (intended production integration: `mapcn`).
- Buttons on governance/UCO/Salam-Cola/logistics screens (see BUTTON_AUDIT_REPORT_FINAL.md).

## Recommendation
1. Replace remaining `FilterBar` usages with `DataTable`'s built-in toolbar as those pages are wired to real data.
2. Implement `RouteMapPanel` with a real map (mapcn) behind a provider interface when logistics is built.
