# COSMY ERP — Dashboard Recalculation Audit

**Date:** 2026-07-10
**Purpose:** Map every executive-dashboard KPI to the **exact source tables** that produce it, so the demo
dataset can be seeded **consistently** and the KPIs populate through the **real services** (no hardcoded
values). This is the blueprint the seeder must satisfy.

---

## The pipeline (group dashboard `/`)
`(dashboard)/page.tsx` → `getGroupDashboardData(user.tenantId)` → `DashboardService.getBusinessScorecard(tenantId)`
→ for **each business in the tenant** → `DashboardService.getExecutiveDashboard(businessId)`.

**Hard prerequisite:** `getExecutiveDashboard` first does
`accountingPeriod.findFirst({ where:{ businessId, status:"OPEN" }})` and **throws "No open period found"** if
none. `getBusinessScorecard` catches the throw and *skips* that business → empty scorecard → **₹0**. So
**every demo business must have an OPEN accounting period.**

## KPI → source tables
| Dashboard KPI | Computed by | Reads from (must be seeded) |
|---|---|---|
| **Revenue / Gross Profit / Net Profit** | `ManagementReportingService.getExecutiveDashboard` → `FinancialReportingService.getProfitAndLoss(businessId, start, end)` | **`journalEntry` + `journalLine`** posted to `ledgerAccount`s of type **REVENUE / EXPENSE**, dated within the open period. Balanced double-entry. |
| **Cash Position** | `treasuryHealth` | **`bankAccount`** (`openingBalance`, `status:"ACTIVE"`) + **`bankTransaction`** (summed) |
| **Cash forecast (30/90d)** | `CashForecastingEngine.generateForecast` | bank balances + `recurringCommitment` (optional) |
| **Open AR / Overdue AR / AR aging** | `receivablesHealth` | **`receivableEntry`** (`amount`, `paidAmount`, `dueDate`, `status≠CLOSED`, `customerId`) |
| **Open AP / Overdue AP / upcoming** | `payablesHealth` | **`payableEntry`** (`amount`, `paidAmount`, `dueDate`, `status≠PAID`, `sourceType`, `sourceId`) |
| **Inventory Value** | `inventoryHealth` (raw SQL) | **`inventoryVariantProjection`** (`onHandQuantity * averageCost`) |
| **Low stock / dead stock** | `inventoryHealth` | `inventoryVariantProjection` (`availableQuantity`, `rebuiltAt`) |
| **Net Working Capital** | derived | `openAR + inventoryValue − openAP` |
| **Compliance (IRN/failures/pending)** | `complianceHealth` | `complianceJob` (by status), `eInvoice`, `customerInvoice` |
| **Top customers / suppliers** | AR/AP exposure | `receivableEntry.groupBy(customerId)` + `customer`; `payableEntry.groupBy(sourceId)` |

## `ExecutiveDashboardProjection` (the `/reports` + recalc target)
`actions/report.ts#recalculateExecutiveDashboard` writes this row from:
- `totalInventoryVal` ← `inventoryReportProjection._sum.totalValue`
- `openPOAmount` ← `purchaseOrder` (status ORDERED/PARTIALLY_RECEIVED) `_sum.totalAmount`
- `activeSuppliers` ← `supplier` (status ACTIVE) count
- `pendingReceipts` ← `goodsReceiptRequest` (REQUESTED/PROCESSING) count

## Consistency rules the seeder MUST honor (so numbers reconcile)
1. **Every demo business ⇒ one OPEN `accountingPeriod`** covering the transaction dates.
2. **Ledger accounts per business:** at minimum `Cash` (ASSET), `Accounts Receivable` (ASSET),
   `Accounts Payable` (LIABILITY), `Sales Revenue` (REVENUE), `COGS` (EXPENSE), `Operating Expense`
   (EXPENSE), `Inventory` (ASSET) — each with correct `accountType` + `normalBalance`.
3. **Sales:** each customer invoice ⇒ (a) `receivableEntry` (amount, dueDate), (b) balanced `journalEntry`:
   Dr AR / Cr Sales Revenue; plus COGS: Dr COGS / Cr Inventory. Payment ⇒ Dr Cash / Cr AR + `bankTransaction`
   + `customerPayment` + reduce `receivableEntry.paidAmount`.
4. **Procurement:** each supplier bill ⇒ `payableEntry` + Dr Inventory/Expense / Cr AP. Payment ⇒ Dr AP /
   Cr Cash. Goods receipt ⇒ `stockMovementRecord` → rebuild `inventoryVariantProjection` (onHand, avgCost).
5. **Bank:** one `bankAccount` per business with an `openingBalance`, plus `bankTransaction`s matching the
   cash journals.
6. **Every journal entry must balance** (Σdebit = Σcredit) and be dated inside the open period.
7. After seeding, **run the real recalc** (`recalculateExecutiveDashboard` + projection rebuild) — do **not**
   write KPI values directly.

## Why this matters
The dashboard is *computed*, not stored. If we seed invoices but no journal lines, Revenue stays ₹0 even
though AR shows values. The seeder must populate the **GL + AR/AP + bank + inventory** together so the KPIs
are internally consistent — which is exactly the "real data model, no hardcoded values" bar you set.

See **DEMO_DATASET_PLAN.md** for the per-business dataset and **DEMO_DATASET_SEEDER.md** for the seeder spec.
