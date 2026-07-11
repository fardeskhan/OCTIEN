# BUTTON_AUDIT_REPORT_FINAL.md

**Date:** 2026-07-11 · **Method:** source review of every interactive control across `(dashboard)` routes, grouped by whether the page is on the **core commercial demo path** (real data) or a **still-mock vertical/governance** screen.

## Core demo path — every button works ✅
Verified: navigates, submits a server action, opens the drawer, prints, or records a change.

| Page | Controls | Wired to |
|---|---|---|
| Inventory · Products | New Product, Open Product, row search, **status filter**, pagination | routes + real DataTable |
| Inventory · Valuation / landing | section nav | routes |
| Sales · Customers | New Customer → **create form → `createCustomer`**, search, status filter, pagination | server action (persists) |
| Sales · Invoices | **New Invoice → create form → `createCustomerInvoice`**, invoice-# link → preview, search/filter/paginate | server action (persists + posts AR) |
| Sales · Invoice preview | template switcher, **Print**, **Download PDF**, **Mark Paid → `recordInvoicePayment`** | real actions |
| Sales · Orders | search, status filter, pagination | real DataTable |
| Procurement · Suppliers | New Supplier → `createSupplier`, Open Supplier, search/filter | server action |
| Procurement · Purchase Orders | Create PO → form, search/filter | route + real DataTable |
| Procurement · Goods Receipts | search/filter/paginate | real DataTable |
| Business Management | Create/Edit/Save (`createBusiness`/`updateBusiness`), Suspend/Archive/Restore (`setBusinessStatus`), logo upload, color pickers | server actions (persist) |
| Finance (all statements/accounting/treasury/close) | **Print / PDF**, section nav, balanced/status badges | real |
| Topbar business switcher | switch (`switchBusiness`), Manage, Create | real |

**Filters/search/pagination:** the shared `DataTable` now provides a **working global search**, an
**auto-derived status dropdown**, live record count, and pagination on all seven core lists. The old
decorative `FilterBar` (non-functional chips) was removed from those pages.

## Still-mock screens — buttons are illustrative (catalogued, not hidden)
| Module | Pages | Buttons (approx) | Nature |
|---|---|---|---|
| Governance (security/audit/compliance/approvals) | 18 | ~30 | mock UI; backends exist, not wired |
| Salam-Cola operational (mfg/distribution/marketing/assets) | 16 | ~23 | no bespoke domain models |
| UCO operational (collections/routes/barrels/quality) | 11 | ~18 | no bespoke domain models |
| Logistics subpages (runs/stops/EWB/transporters) | ~5 | ~9 | rich DB models exist, unseeded/unwired |

**Total pages still carrying placeholder actions: 50 / 119** — all off the core commercial path.

## Fixed this pass
- Built the missing **New Customer** and **New Invoice** create flows (were dead/absent).
- Added **Mark Paid** (records payment, updates AR) on the invoice preview.
- Removed no-op buttons (product bulk Update/Archive/Delete; GRN Scan/Receive; customer View Ledger).

## Recommendation
Wire **governance** next (backends exist → removes 18 mock pages), then **logistics** (models exist, needs
seeding + pages), then decide bespoke UCO/Salam-Cola domains vs. demo-through-generic-ERP.
