# CRUD_AUDIT_REPORT.md

**Date:** 2026-07-11 · Legend: ✅ working (server action, persists) · 🟡 partial · — not built.
"Archive" = soft-delete/status; every list ✅ under Read has **search / status filter / sort / pagination / CSV export** via the shared DataTable (finance statements use print/PDF instead).

| Entity | Create | Read | Update | Delete/Archive | Notes |
|---|---|---|---|---|---|
| Businesses | ✅ | ✅ | ✅ | ✅ archive/suspend/restore | branding + logo persist |
| Products | ✅ | ✅ | 🟡 via variants | — | detail page real |
| Product Variants | ✅ | ✅ | ✅ inline | ✅ soft (keeps ≥1) | 404 workflow fixed |
| Customers | ✅ | ✅ | 🟡 status action exists, no edit form | — | |
| Suppliers | ✅ | ✅ | 🟡 contacts add | — | |
| Purchase Orders | ✅ | ✅ | 🟡 approve action (no detail UI) | — | |
| Goods Receipts | ✅ (from PO) | ✅ | ✅ process action | — | |
| Supplier Bills | ✅ | ✅ | 🟡 | — | via payables |
| Sales Orders | ✅ | ✅ | 🟡 fulfil actions | — | |
| Invoices | ✅ | ✅ | ✅ pay/partial | ✅ void + soft delete | full lifecycle |
| Drivers / Vehicles / Runs / Stops | seeded | ✅ | — | — | live status derived |
| E-Way Bills | ✅ | ✅ | ✅ edit draft | ✅ cancel | provider-based generate |
| Users | — invite | ✅ | — | — | list real |
| Roles / Permissions | — | ✅ | — assign UI | — | matrix real |
| Inventory (ledger) | ✅ adjust/transfer/receive | ✅ | ✅ | n/a | reconciles to on-hand |
| Warehouses | ✅ | ✅ | — | — | |
| Bank Accounts | seeded | ✅ | — | — | |
| Journal Entries | seeded | ✅ | — manual-JE UI | — | GL real |
| Assets | — | ✅ (empty-state) | — | — | |
| Approvals | — | ✅ | — act UI | — | request list real |
| Notifications | — | — | — | — | not built (activity feed instead) |
| Reports | n/a | ✅ | n/a | n/a | print/PDF + CSV export |

## Biggest remaining CRUD gaps (priority)
1. Customer/Supplier **edit forms** (update actions partially exist).
2. PO **detail page** with approve/receive buttons (actions ready).
3. Manual **journal entry** UI; bank-rec import.
4. User invite + role-assignment UI (models + list ready).
5. Bulk actions beyond selection UI; import flows.
