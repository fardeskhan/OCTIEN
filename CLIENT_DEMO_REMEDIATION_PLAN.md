# COSMY ERP — Client Demo Remediation Plan

**Date:** 2026-07-10
**Goal:** Reach a **credible, click-through client demo** on the fastest path — not full production of every
planned feature. Based on [PRODUCTION_READINESS_AUDIT.md](PRODUCTION_READINESS_AUDIT.md).

**Core insight:** the expensive parts (schema, finance/logistics/compliance domains, server actions) are
**already built**. What's missing is **RBAC seeding, a coherent per-business demo dataset, navigation, and
wiring a few real screens.** Two small unlocks turn a large amount of already-real code into a working demo.

Effort key: **S** ≤ half day · **M** ~1–2 days · **L** ~3–5 days.

---

## Phase 0 — Unblock (do first; tiny effort, huge impact) — ✅ DONE (2026-07-10)
These remove the two hard blockers and the broken links. After Phase 0, the **already-real** finance/
procurement/sales pages become usable.

1. **Seed RBAC** ✅ — seeded the 29-permission catalog and granted the **Owner** role all 29 (plus
   domain-appropriate subsets for Finance/Operations/Warehouse/Sales/Auditor/Driver). **Verified:** the
   Owner's flattened permission set resolves every gated check to PASS
   (`finance.read/write`, `inventory.update`, `logistics.read`, `sales.write`, `reporting.read`,
   `governance.read`). `requirePermission()` now passes for the demo user. Data seeding only — no
   auth-architecture change.
2. **Fix broken nav** ✅ — built a real `/reports` hub (uses `report.ts` actions) and a `/lumas`
   "coming soon" placeholder. Both routes now exist (no 404); build green.
3. **Local auth config** ⏸ **intentionally skipped** — per the "do not touch auth architecture" constraint
   and because auth is currently working. `BETTER_AUTH_URL=https://pilot.cosmy.ai` and the adapter
   `provider:"postgresql"` on sqlite remain as **documented recommendations** for the production/local-dev
   pass, not changed here.

## Phase 1 — One coherent demo business + populated dashboard — ~2–3 days *(M–L)*
Right now the seed is 550k scale-test rows across a "Test Biz"; the logged-in business (Aeterex Holdings)
has empty projections → ₹0 KPIs. Build a **single curated dataset** for the demo business:

1. Open **accounting period** for the demo business.
2. **Master data:** units, ~10 products + variants, 3–4 warehouses, ~10 customers, ~6 suppliers.
3. **Inventory:** stock receipts → `stockMovementRecord` → rebuild `inventoryVariantProjection` (so
   valuation/on-hand are real).
4. **Procurement flow:** a few requisitions → POs → goods receipts → supplier bills → payments.
5. **Sales flow:** quotations → orders → invoices → customer payments (a few dozen, realistic amounts).
6. **Treasury:** cash transactions + bank movements.
7. **Compute projections:** run `recalculateExecutiveDashboard` + report projections so the **group
   dashboard KPIs populate** (Revenue, AR, AP, Cash, Working Capital) instead of ₹0.

**Outcome:** Dashboard, Finance (AR/AP/cash), Procurement, Sales, Inventory all show coherent real numbers
for one business — the spine of a convincing demo.

## Phase 2 — Surface the real screens in navigation — ~1–2 days *(M)*
Many **real** pages exist but are unreachable (flat sidebar).
1. Add **sub-navigation** (section sidebars or a nav tree) exposing: Finance → Receivables/Payables/Cash;
   Inventory → Products/Warehouses; Procurement → Suppliers/Orders/Receipts/Requisitions; Sales →
   Customers/Quotations/Orders.
2. Replace the 3–4 highest-value **mock list pages** with real data (the actions + data already exist):
   `sales/orders`, `sales/invoices`, `inventory/products`, `sales/customers` (list).

**After Phases 0–2 you can demo:** Business switch · Dashboard with real KPIs · Finance AR/AP/cash ·
Procurement (suppliers→PO→GRN→bill) · Sales (customer→quote→order→invoice→payment) · Inventory
(products/warehouses/stock).

## Phase 3 — Business-specific modules (UCO, Salam Cola) — ~1–2 weeks *(L)*
These are **100% mock** today (no models/data/actions). Decide per business:
- **Fast demo option:** keep the existing polished mock screens, clearly labeled as illustrative, and drive
  the *cross-cutting* ERP (inventory/finance/logistics) for these businesses via the generic modules.
- **Real option:** model UCO collections/routes/barrels and Salam-Cola manufacturing/distribution as real
  domains — significant new build.

## Phase 4 — Finance depth — ~3–5 days *(L)*
Wire the mock finance pages to the **existing** services: `accounting/{journals,ledger,trial-balance}`,
`statements/{pnl,balance-sheet,cash-flow}`, `assets/*`, `close/*`. Backend (225k journals, 14 accounts,
services in `lib/finance/*`) is ready; only the screens are mock.

## Phase 5 — Logistics & Compliance — ~3–5 days *(L)*
Seed logistics (runs/stops/drivers/vehicles/EWB) and wire the mock subpages + governance/compliance screens
to the existing services (`lib/compliance/*`, `actions/logistics.ts`).

---

## Recommended "Minimum Credible Demo" (Phases 0–2, ~4–6 days)
Fully working: **Auth · Business switch · Executive Dashboard (real KPIs) · Finance AR/AP/Cash · Procurement
· Sales · Inventory.** UCO/Salam-Cola shown as polished visual concepts. This is achievable quickly because
it *activates existing real code* rather than building new features.

## Explicitly NOT in scope for the demo (and why)
- Rebuilding every mock page to production quality (Design System V2 phase).
- Real UCO/Salam-Cola domains (large new build — Phase 3).
- ODD-1 (`SupplierBillLine.account`) and the AUTH_CONSISTENCY_REVIEW backlog — real but not demo-blocking.

## Suggested sequence
```
Phase 0 (unblock)  →  Phase 1 (demo data + dashboard)  →  Phase 2 (nav + real lists)
   →  [DEMO-READY]  →  Phase 4 (finance depth)  →  Phase 5 (logistics/compliance)  →  Phase 3 (UCO/Salam)
```
