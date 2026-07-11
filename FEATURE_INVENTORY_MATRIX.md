# COSMY ERP — Feature Inventory Matrix

**Date:** 2026-07-10
**Legend:** ✅ done · 🟡 partial · 🔴 missing/mock · ⛔ blocked.
Columns — **Route** · **Nav** (reachable from sidebar) · **CRUD** (server actions) · **BE** (backend/domain
service) · **UI** (real screen vs mock) · **RBAC** (permission enforced & granted) · **Demo** (usable today)
· **Prod** (production-ready).

> RBAC note: after **Phase 0**, the Owner role holds all 29 permissions, so permission gates now **pass** for
> the demo user (previously ⛔ everywhere). "Demo" still depends on seeded data (mostly absent — Phase 1).

| Module | Route | Nav | CRUD | BE | UI | RBAC | Demo | Prod |
|---|---|---|---|---|---|---|---|---|
| Business Management | `/` (switcher) | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | 🟡 |
| Create Business | — | 🔴 | 🟡 | ✅ | 🔴 | ✅ | 🔴 | 🔴 |
| Switch Business | topbar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| User Management | `/governance/security/users` | 🟡 | 🟡 | ✅ | 🔴 mock | ✅ | 🔴 | 🔴 |
| Roles & Permissions | `/governance/security/roles` | 🟡 | 🟡 | ✅ | 🔴 mock | ✅ | 🔴 | 🔴 |
| Executive Dashboard | `/` | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 (₹0 until Phase 1) | 🟡 |
| Products / Variants | `/inventory/products` | ✅ | ✅ | ✅ | 🟡 (create real, list mock) | ✅ | 🔴 (0 products) | 🟡 |
| Warehouses | `/inventory/warehouses` | 🟡 | ✅ | ✅ | ✅ | ✅ | 🔴 (0) | 🟡 |
| Inventory / Stock | `/inventory/*` | 🟡 | ✅ + dialogs | ✅ | 🔴 mostly mock | ✅ | 🔴 (0) | 🟡 |
| Suppliers | `/operations/procurement/suppliers` | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 (3) | 🟡 |
| Purchase Orders | `/operations/procurement/orders` | 🟡 | ✅ | ✅ | ✅ | ✅ | 🔴 (0) | 🟡 |
| Goods Receipts | `/operations/procurement/receipts` | 🟡 | ✅ | ✅ | ✅ | ✅ | 🔴 (0) | 🟡 |
| Requisitions | `/operations/procurement/requisitions` | 🟡 | ✅ | ✅ | ✅ | ✅ | 🔴 (0) | 🟡 |
| Supplier Bills | (via Payables) | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 (15k test) | 🟡 |
| Customers | `/sales/customers` | 🟡 | ✅ | ✅ | 🟡 (detail real, list mock) | ✅ | 🟡 (22) | 🟡 |
| Quotations | `/sales/quotations` | 🟡 | ✅ | ✅ | ✅ | ✅ | 🔴 (0) | 🟡 |
| Sales Orders | `/sales/orders` | 🟡 | ✅ | ✅ | 🔴 mock list | ✅ | 🔴 (0) | 🟡 |
| Invoices | `/sales/invoices` | 🟡 | 🟡 | ✅ | 🔴 mock list | ✅ | 🟡 (550k test) | 🟡 |
| Payments | (AR/AP pages) | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 (160k test) | 🟡 |
| Finance — landing | `/finance` | ✅ | ✅ | ✅ | ✅ real | ✅ | 🟡 | 🟡 |
| Finance — Receivables | `/finance/receivables` | 🟡 | ✅ | ✅ | ✅ real | ✅ | 🟡 (data on test biz) | 🟡 |
| Finance — Payables | `/finance/payables` | 🟡 | ✅ | ✅ | ✅ real | ✅ | 🟡 | 🟡 |
| Treasury / Cash | `/finance/treasury/*` | 🟡 | ✅ | ✅ | 🟡 (ledger real, rest mock) | ✅ | 🔴 (0 cashTx) | 🟡 |
| Accounting (journals/ledger/TB) | `/finance/accounting/*` | 🔴 | 🟡 | ✅ 225k journals | 🔴 mock | ✅ | 🔴 | 🟡 |
| Statements (P&L/BS/CF) | `/finance/statements/*` | 🔴 | 🟡 | ✅ | 🔴 mock | ✅ | 🔴 | 🟡 |
| Period Close | `/finance/close/*` | 🔴 | 🟡 | ✅ | 🔴 mock | ✅ | 🔴 | 🟡 |
| Reporting | `/reports` | ✅ | ✅ | ✅ | ✅ (Phase 0) | ✅ | 🟡 (0 projections) | 🟡 |
| Logistics — runs/EWB/POD | `/operations/logistics/*` | ✅ | ✅ | ✅ | 🟡 (landing real, subpages mock) | ✅ | 🔴 (0) | 🔴 |
| Drivers / Vehicles | `/operations/logistics/*` | 🟡 | ✅ | ✅ | 🔴 mock | ✅ | 🔴 (0) | 🔴 |
| E-Way Bills | `/operations/logistics/ewb` | 🟡 | ✅ | ✅ | 🔴 mock | ✅ | 🔴 (0) | 🔴 |
| Compliance (e-invoice/e-way) | `/governance/compliance/*` | 🟡 | 🟡 | ✅ | 🔴 mock | ✅ | 🔴 | 🔴 |
| Audit / Approvals | `/governance/*` | 🟡 | 🟡 | ✅ | 🔴 mock | ✅ | 🔴 | 🔴 |
| **UCO module** | `/uco/*` | ✅ | 🔴 | 🔴 (no UCO models) | 🔴 mock | ✅ | 🔴 | 🔴 |
| **Salam Cola module** | `/salam-cola/*` | ✅ | 🔴 | 🔴 (no models) | 🔴 mock | ✅ | 🔴 | 🔴 |
| Casa de Lumas | `/lumas` | ✅ | 🔴 | 🔴 | 🟡 placeholder | ✅ | 🔴 | 🔴 |

## Key takeaways
- **Generic ERP core (Finance/Procurement/Sales/Inventory/Dashboard)** is real and RBAC-enabled — it just
  needs **coherent per-business data** (Phase 1) to light up.
- **UCO & Salam-Cola *domain-specific* screens are 100% mock** — there are no UCO/beverage-specific models.
  Those businesses will be demoed **through the generic ERP** (they sell products, raise invoices, collect
  payments); their bespoke operational screens (collection routes, manufacturing) remain illustrative until
  built as real domains.
- The **transactional workflows exist as server actions**; the fastest demo path is to **seed consistent
  data for the real tables** and let the real services compute the dashboards (see
  DASHBOARD_RECALCULATION_AUDIT.md).
