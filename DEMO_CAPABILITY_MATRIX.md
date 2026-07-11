# COSMY ERP — Demo Capability Matrix

**Date:** 2026-07-10
**Method:** Source-verified (each page classified by its actual data source in code — DB query /
`requireBusinessContext` / action getter = **real**; `_data/*` import or inline array = **mock**). This is
exact, not estimated.

> **Correction to my Phase 1 summary.** I overstated it. The demo-critical **list** pages
> (`inventory/products`, `sales/customers`, `operations/procurement/suppliers`, `sales/orders`,
> `sales/invoices`, procurement `orders`/`receipts` lists) are **MOCK** — they render `_data/*` placeholder
> arrays, so the seeded Salam Cola / UCO records **do not appear** on them. The seeded data shows only on
> the **dashboards and finance AR/AP pages**. Below is the honest, verified breakdown.

---

## Exact counts (`(dashboard)` routes)
| Metric | Count |
|---|---|
| Total pages | **113** |
| **Mock** (render `_data/*` or inline arrays) | **77** (72 via `_data`, 5 logistics inline) |
| **Real** (DB / `requireBusinessContext` / getters) | **~25** |
| Placeholder / nav-only | 2 (`/reports` real hub, `/lumas` coming-soon) |
| Broken routes (404) | **0** (fixed in Phase 0) |
| Pages that render the **seeded demo data** | **~6** |

## The ~6 pages that actually show seeded Salam Cola / UCO data
| Route | Shows | Verified |
|---|---|---|
| `/` (Group Dashboard) | Group consolidated KPIs (₹1.9 Cr rev, ₹47 L profit, ₹73 L cash…) | ✅ live-computed |
| `/finance` | AR ₹35 L, AP ₹18 L (current business) — **Net Cash shows ₹0** ⚠️ | 🟡 partial (see note) |
| `/finance/receivables` | seeded customer invoices | ✅ |
| `/finance/payables` | seeded supplier bills | ✅ |
| `/operations/procurement/dashboard` | supplier/PO/GRN counts | ✅ (3 suppliers, 0 PO) |
| `/reports` | projection KPIs | ✅ |

⚠️ **Data inconsistency found:** the seeder posts a `Cash & Bank` journal + `bankAccount.openingBalance`
(which the group dashboard reads → ₹73 L), but **no `cashTransaction` rows** — and `/finance` + the cash
ledger read `cashTransaction`, so they show **₹0**. Fixing this (seed cash transactions) is a Phase-2 item.

## "Real" pages that render but are **empty** for the demo business
`/operations/procurement/requisitions` (list), `/operations/logistics` (landing), `/finance/treasury/ledger`,
procurement `orders/[id]` & `suppliers/[id]` (need an id) — real code, but 0 seeded rows for those entities.

## Module-level demo capability
| Module | Real DB? | Real txns? | Mock? | Client-Demo-Ready? | Prod-Ready? |
|---|---|---|---|---|---|
| Group Dashboard | ✅ | ✅ | — | ✅ **yes** | 🟡 |
| Finance — Receivables / Payables | ✅ | ✅ | — | ✅ **yes** | 🟡 |
| Finance — landing | ✅ | 🟡 (cash 0) | — | 🟡 partial | 🟡 |
| Finance — Treasury/Accounting/Statements/Assets/Close | backend ✅ | — | 🔴 pages mock | 🔴 no | 🔴 |
| Procurement — dashboard | ✅ | ✅ | — | ✅ yes | 🟡 |
| Procurement — Suppliers / Orders / Receipts (lists) | 🔴 | 🔴 | ✅ mock | 🔴 **no** | 🔴 |
| Procurement — detail/new (`[id]`,`new`) | ✅ | 🟡 | — | 🟡 (need data) | 🟡 |
| Inventory — Products / Stock (lists) | 🔴 | 🔴 | ✅ mock | 🔴 **no** | 🔴 |
| Inventory — Warehouses / products-new | ✅ | 🟡 | — | 🟡 (empty lists) | 🟡 |
| Sales — Customers / Orders / Invoices (lists) | 🔴 | 🔴 | ✅ mock | 🔴 **no** | 🔴 |
| Sales — Quotations / Returns | ✅ getter | 🔴 (0) | — | 🟡 (empty) | 🟡 |
| Logistics (all) | landing ✅ | 🔴 (0) | 🔴 subpages mock | 🔴 no | 🔴 |
| Governance (all) | backend ✅ | — | 🔴 mock | 🔴 no | 🔴 |
| Reports | ✅ | 🟡 | — | 🟡 | 🟡 |

## UCO screens — fully / partial / mock (you asked explicitly)
Every `/uco/*` screen is **MOCK** (renders `_data/uco`). None show real data:
- **Fully functional:** none.
- **Partially functional:** none.
- **Mock only (11):** `/uco`, `/uco/sources`, `/uco/barrels`, `/uco/quality`, `/uco/customers`,
  `/uco/collections` (+ scheduled/pending/missed/completed), `/uco/routes` (+ stops/exceptions/efficiency).

UCO's **financials are real** only through the **generic** Finance pages when you switch to the COSMY UCO
business (₹65 L revenue, ₹12 L AR). The UCO-specific operational UI is illustrative.
(**Salam Cola** is the same: all `/salam-cola/*` screens are mock; its real data is via generic Finance.)

## Important dashboard behaviour (so the demo isn't misread)
- **`/` (Group Dashboard) does NOT change when you switch business** — by design it reads `user.tenantId`
  and always shows the **COSMY Group consolidated** view (Salam + UCO).
- **Per-business numbers change on `/finance`** (and receivables/payables), which read the *selected*
  business. So: switch to Salam Cola → `/finance` shows ₹35 L AR; switch to UCO → shows ₹12 L AR. **That**
  is the "numbers change per business" proof — on the finance pages, not on `/`.

## Rankings
**1. Demo-ready now (show seeded data):** Group Dashboard · Finance Receivables · Finance Payables ·
Procurement Dashboard · Reports. *(Finance landing once the cash-transaction gap is fixed.)*

**2. Near demo-ready (real page, just needs data/1 fix):** Finance landing (seed cashTransactions) ·
Procurement requisitions list · Inventory warehouses · Sales quotations/returns.

**3. Requires build work (mock → real):** all list pages (Products, Customers, Suppliers, Orders, Invoices,
Receipts) · all UCO screens · all Salam-Cola screens · Finance Accounting/Statements/Assets/Close · Logistics
subpages · all Governance screens. **≈ 77 pages.**

## Bottom line
- **Client-Demo-Ready:** ~30–40% (a compelling dashboard-led + finance story for two businesses).
- **Production-Ready:** ~40–50% (architecture/backend strong; **~77 mock pages** must be wired to real data
  and CRUD before "production ERP" is honest).
- The remaining work is **UI/route/CRUD completion**, not architecture or schema.

## Recommended Phase 2 (highest demo leverage first)
1. Fix the **cash-transaction gap** so `/finance` net cash matches the dashboard. *(S)*
2. Convert the **6 core list pages** (products, customers, suppliers, sales orders, invoices, procurement
   orders/receipts) from mock → real via the existing `getCustomers`/`getProducts`/etc. server actions, so
   the seeded records appear. *(M)*
3. Seed a few **POs → GRNs → Sales Orders** so procurement/sales lists have rows. *(S)*
