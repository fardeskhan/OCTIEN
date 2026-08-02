# CAP-SALES V1.0 — Release Notes

**Module:** OCTIEN Sales · **Status:** ✅ **PRODUCTION READY (frozen reference module)**
**Date:** 2026-07-24 · **Verified against:** live Neon PostgreSQL

CAP-SALES V1.0 is the **canonical implementation pattern** for OCTIEN. Procurement, Inventory,
Finance, Salam Cola and UCO should follow its architecture, workflows, reporting, verification and
documentation. It should now receive only bug fixes and intentional enhancements — not
architectural changes.

## Overview
A complete order-to-cash capability: quote a customer, take the order, reserve stock, deliver,
invoice, collect payment, and have every step post correct double-entry accounting and surface in
ledgers, statements, aging, dashboards and reports — with a single Customer 360 view over it all.

## Architecture
- **Domain services own the logic** (`lib/finance/customer-ledger`, `lib/finance/receivables-aging`,
  `lib/finance/posting-engine`, `lib/finance/sales-posting`, `lib/sales/*`).
- **Event-driven side effects** via the outbox (`SalesOrderConfirmed → reservation`,
  `ShipmentDispatched → stock-out + COGS + invoice`), drained synchronously with `drainOutbox()`.
- **One design system** (`components/enterprise/*`, foldered: data/feedback/forms/layout/security)
  including a config-driven reporting framework (`EnterpriseReportLayout` + `EnterpriseReportTable`).
- **Runtime verification harness** (`lib/verification/sales-runtime.ts` + `/api/dev/verify-*`).

## Implemented features
- **Quotations** — create, lifecycle (send/accept/reject/expire), convert to Sales Order.
- **Sales Orders** — create-from-quote, approve, **confirm (reserves stock)**, fulfil, cancel
  (releases reservation), detail with lines/reserved qty, audit timeline, create-delivery.
- **Deliveries / Shipments** — list + KPIs, detail with pick→pack→dispatch→deliver (valid
  transitions only), reserved/picked/packed/shipped visibility, **downstream-status panel**
  (reserved/deducted/invoice/journal/audit), printable **Delivery Note**.
- **Invoices & Payments** — creation posts **balanced journals**; payments post cash receipts.
- **Accounting** — invoice = DR AR / CR Revenue / CR Output GST; payment = DR Bank / CR AR; dispatch
  = DR COGS / CR Inventory. Posting is integral (invoice rolls back if it cannot post).
- **Customer Ledger** — canonical receivables source of truth (running balance, outstanding,
  overdue, DSO).
- **Customer Statements** — summary + transaction ledger, print + CSV.
- **Aging Report** — buckets Current/1-30/31-60/61-90/91-120/120+, KPIs (collection %, DSO,
  expected), aging & collections charts, top overdue.
- **Sales Dashboard** — executive KPIs, revenue/collections trends, receivables, operations, top
  lists, alerts.
- **Sales Reports** — Invoice / Shipment / Payment registers, Customer Sales, Product Sales, Margin.
- **Customer 360** — master + credit + summary + activity + ledger/aging snapshots + operations +
  top products + a unified chronological **timeline** (quotation→order→shipment→invoice→payment→audit).

## Workflows
Quotation → Sales Order → Reservation → Shipment → Dispatch → Invoice → Payment → Journal → General
Ledger → Customer Ledger → Statement → Aging → Dashboard → Reports → Customer 360 → Audit.

## Security · Permissions · Audit
- RBAC: reads `sales.read`; writes `sales.write` / `fulfillment.create|update`; Owner super-admin.
- Every mutation is audited (`logAudit`), surfaced in detail pages and the 360 timeline.
- Multi-tenant: all queries scoped by `businessId`.

## Verification results
- **End-to-end runtime verification: 25/25 PASS** on live Neon (reservation, projection deltas,
  stock-out, COGS, invoice+payment journals, **GL balanced Σdebits=Σcredits**).
- `tsc` ✅ · `npm run build` ✅ · ESLint (Sales) ✅ · authenticated render smokes ✅ (statements,
  aging, dashboard, reports, Customer 360 — all tie out to the same figures).

## Known limitations (explicit, not hidden)
1. **Customer credit limits are not modeled.** `Customer` has `creditStatus` only — no
   `creditLimit`. "Available Credit" shows *Not set*. (Planned: `creditLimit/creditDays/creditHold/
   creditWarningThreshold`.)
2. **Credit Note domain not implemented.** No `CreditNote` model. The ledger is already structured
   to accept credit notes as a credit transaction once the model exists.
3. **Report exports are CSV + Print only.** Native **PDF / XLSX** export requires additional
   libraries and implementation.
4. **Shared cross-report filter presets** (saved filters, date/warehouse/territory) are planned but
   not yet available; reports currently support search + status filter + column sort.
5. **`territory` / `salesperson` dimensions** are not in the schema, so those filters/segments are
   deferred.
6. **Background-job runner** still absent (outbox is drained synchronously per action); the
   Operations Center that would surface failed events is designed (`OPERATIONS_CENTER_DESIGN.md`) but
   not built.

## Future enhancements
- Credit-control workflow (limits, holds, exposure, auto-blocking) once credit-limit fields land.
- Credit/Debit Note domain.
- PDF/XLSX exports + saved report presets + cross-report filters.
- Operations Center (workflow monitor, outbox queue, DLQ replay, audit explorer).
- Generalized per-module runtime-verification framework (after ≥3 modules).

## Release status
**CAP-SALES V1.0 — PRODUCTION READY.** Frozen as the reference module for the rest of OCTIEN.
