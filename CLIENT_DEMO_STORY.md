# COSMY ERP — Client Demo Story

**Date:** 2026-07-10
**Login:** `owner@cosmy.ai` (Owner of the **COSMY Group** tenant — Salam Cola + COSMY UCO).
**Data:** seeded by `scripts/seed-cosmy-demo.mjs` — all numbers are **computed by the real services** from
seeded transactions (no hardcoded UI values). Re-runnable and idempotent.

> **Refresh note:** if the app was already open, hard-refresh after seeding. The group dashboard reads
> `user.tenantId`, which is now COSMY Group.

---

## The numbers the demo will show (computed, verified)
| | Revenue | Net Profit | Open AR | Open AP | Cash | Inventory |
|---|---|---|---|---|---|---|
| **Salam Cola** | ₹1.25 Cr | ₹30 L | ₹35 L | ₹18 L | ₹54 L | ₹30 L |
| **COSMY UCO** | ₹65 L | ₹17 L | ₹12 L | ₹6 L | ₹19 L | ₹11 L |
| **COSMY Group** | **₹1.9 Cr** | **₹47 L** | **₹47 L** | **₹24 L** | **₹73 L** | WC ₹64.6 L |

---

## Scenario 1 — Executive View (open with this)
1. Land on **`/` (Group Dashboard)** → "COSMY Group" consolidated KPIs populate: Revenue ₹1.9 Cr, Net Profit
   ₹47 L, Cash ₹73 L, Open Receivables ₹47 L, and the **Revenue vs. Net Profit by Business** chart shows
   Salam Cola vs COSMY UCO side by side (Business Unit Comparison card).
2. Talking point: *"One consolidated view across every business the group runs — computed live from the
   ledger, not a static report."*

## Scenario 2 — Salam Cola operations (the beverage business)
1. **Switch business** (top-left switcher) → **Salam Cola**.
2. **Finance → Receivables**: 6 customer invoices to distributors (National Foods, Metro Cash & Carry…),
   ₹35 L outstanding. **Payables**: supplier bills (ClearGlass Bottling, PrintPack Labels…), ₹18 L open.
3. **Procurement → Suppliers**: 6 real suppliers (bottles, labels, cartons, ingredients, gas, logistics).
4. **Inventory**: 6 products (Cola / Orange / Lime × 250 ml & 500 ml) with on-hand stock; inventory value ₹30 L.
5. **Finance landing**: AR / AP / Net Cash tiles + section navigation.
6. Talking point: *"Buy packaging & ingredients → hold finished-goods stock → invoice distributors →
   collect payments → the dashboard updates."*

## Scenario 3 — COSMY UCO operations (used-cooking-oil collection)
1. **Switch business** → **COSMY UCO**.
2. **Inventory**: Grade A / Grade B / Filtered UCO with litres on hand.
3. **Sales/Finance**: customers are biodiesel & soap manufacturers (Global Biofuels, EcoDiesel,
   GreenSoap…); ₹12 L receivables, ₹65 L revenue, ₹17 L profit.
4. **Procurement**: collection sources modelled as suppliers (restaurant groups, hotels, food courts).
5. Talking point: *"The same ERP runs a completely different business — collect oil from food-service
   sources, store it, and sell to biodiesel producers."*

## Suggested flow
`Group Dashboard → switch to Salam Cola (finance + inventory + procurement) → switch to COSMY UCO → back
to Group Dashboard to reinforce consolidation.`

---

## Honest scope notes (say these if asked; don't oversell)
- **Live & real:** login, RBAC (Owner permissions), business switching, **group + per-business dashboards,
  Finance (AR/AP/landing), Procurement (suppliers), Inventory (products/stock)** — all computed from the
  seeded ledger/AR/AP/inventory.
- **Illustrative (mock) today:** the **UCO collection-route/driver screens** and **Salam-Cola
  manufacturing/distribution/marketing screens** are polished UI concepts — there are no bespoke
  UCO/beverage domain models yet. Demo those businesses **through the generic ERP** (finance, inventory,
  procurement, sales), which is real. Also mock: finance Accounting/Statements/Assets/Close pages,
  Logistics subpages, and Governance screens (backends exist; screens not yet wired).
- **Not built:** Create-Business UI, Casa de Lumas (placeholder).

## Reproduce / reset the demo data
```
cd COSMY-BOS
DATABASE_URL="file:D:/cosmyerp/COSMY-BOS/packages/database/prisma/dev.db" node scripts/seed-cosmy-demo.mjs
```
Idempotent — master data upserts; journals reset so amounts never double.
