# COSMY ERP — Demo Dataset Plan

**Date:** 2026-07-10
**Implementation (the seeder):** `scripts/seed-cosmy-demo.mjs` — idempotent; run with
`DATABASE_URL="file:.../dev.db" node scripts/seed-cosmy-demo.mjs`. This doubles as **DEMO_DATASET_SEEDER**.
**Design rationale:** see [DASHBOARD_RECALCULATION_AUDIT.md](DASHBOARD_RECALCULATION_AUDIT.md) — the dataset
is built to satisfy the exact tables the dashboard computes from, so KPIs are real, not hardcoded.

## Structure
```
COSMY Group (tenant)
├── Salam Cola   (beverage business)
└── COSMY UCO    (used-cooking-oil collection business)
```
Demo user `owner@cosmy.ai` is repointed to the COSMY Group tenant with an **Owner** role (all 29 permissions)
and membership to both businesses.

## What is seeded per business (real data model)
| Area | Seeded |
|---|---|
| Accounting period | one **OPEN** period for the current month (required by the dashboard) |
| Chart of accounts | Cash, AR, Inventory, AP, Sales Revenue, COGS, Operating Expenses (correct type + normal balance) |
| GL (journals) | balanced double-entry: revenue (Dr AR / Cr Revenue), COGS (Dr COGS / Cr Inventory), opex (Dr OpEx / Cr Cash), collections (Dr Cash / Cr AR) — dated in the period |
| Receivables | customer invoices + `receivableEntry` (partly collected → open AR) |
| Payables | supplier bills + `payableEntry` (partly paid → open AP) |
| Bank / cash | one active bank account with an opening balance |
| Inventory | products + variants + units + warehouses + `inventoryVariantProjection` (on-hand × avg cost) |
| Master data | customers (distributors / biodiesel buyers), suppliers (packaging / collection sources) |
| Projection | `ExecutiveDashboardProjection` row for `/reports` |

## Target figures (chosen for a believable story; all reconcile)
| Business | Revenue | COGS | OpEx | Net Profit | Open AR | Open AP | Cash | Inventory |
|---|---|---|---|---|---|---|---|---|
| Salam Cola | ₹1.25 Cr | ₹75 L | ₹20 L | ₹30 L | ₹35 L | ₹18 L | ₹54 L | ₹30 L |
| COSMY UCO | ₹65 L | ₹40 L | ₹8 L | ₹17 L | ₹12 L | ₹6 L | ₹19 L | ₹11 L |
| **Group** | **₹1.9 Cr** | — | — | **₹47 L** | **₹47 L** | **₹24 L** | **₹73 L** | WC ₹64.6 L |

**Verified:** recomputing these via the dashboard's own logic (journal lines on REVENUE/EXPENSE accounts +
AR/AP/bank/inventory) returns exactly these numbers.

## Idempotency / re-run behaviour
- Master data, memberships, receivables, payables, bank, inventory, projections → **upserted** (no dupes).
- **Journals are reset** (delete-then-repost) each run so revenue/profit never double.

## Consciously NOT seeded (documented limits)
- Bespoke **UCO** (collection runs/routes/barrels) and **Salam-Cola** (manufacturing/distribution) domains —
  no such models exist; those businesses are demoed through the generic ERP.
- Logistics (runs/drivers/vehicles/EWB) and the mock Governance/Accounting/Statements screens — backends
  exist but screens aren't wired; out of scope for the fastest demo.

## One infrastructure note surfaced while seeding
The `ExecutiveDashboardProjection` data columns existed in the Prisma schema/client but had **not been
applied to the sqlite DB** (schema changes were `generate`d, never migrated). The seeder adds them via a
non-destructive `ALTER TABLE`. For production, run a proper `prisma migrate` to reconcile the schema with
the database (also fixes `/reports` writes and the `variant` FK constraints).
