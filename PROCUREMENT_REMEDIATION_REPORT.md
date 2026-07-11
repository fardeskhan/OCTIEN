# PROCUREMENT_REMEDIATION_REPORT.md

**Date:** 2026-07-11 · **Verified:** `tsc --noEmit` EXIT 0 · `next build` success.

## Status: production-demo ready
| Area | State | Source / Notes |
|---|---|---|
| Suppliers list | ✅ real | `supplier` + PO counts; real risk level, payment terms, active-PO count |
| Purchase Orders list | ✅ real | `purchaseOrder` + supplier; status pipeline |
| Goods Receipts list | ✅ real | `goodsReceiptRequest` + PO/supplier + line count |
| Procurement dashboard (KPIs) | ✅ real | open reqs, open POs, overdue POs, pending receipts, active suppliers |
| Supplier Bills | ✅ real | surfaced via Finance → Payables |
| Search / Filters | ✅ real | working global search + status dropdown on every list (see UI report) |
| Create Supplier | ✅ real | `/operations/procurement/suppliers/new` → `createSupplier` (persists) |
| Create PO | ✅ real | `/operations/procurement/orders/new` (persists) |
| Seeded data | ✅ | Salam Cola: 6 suppliers, 4 POs, 1 GRN · UCO: 3 suppliers, 3 POs, 1 GRN |

## Seeded transactions (idempotent)
POs across a realistic status spread (Received / Ordered / Approved / Draft), a matching Goods Receipt for
each received PO, and PO lines referencing real product variants. `ExecutiveDashboardProjection.openPOAmount`
and `pendingReceipts` now **derive from the actual open POs** (previously placeholder constants).

## Dead buttons removed / wired
- Suppliers list: "New Supplier" → real route; drawer "Open Supplier" → `/suppliers/[id]`.
- PO list: "Create PO" → real route.
- Goods Receipts: removed the mock "Scan"/"Receive" no-op buttons.

## Approval workflow & status transitions
Backend actions exist (`order.ts`: `approvePurchaseOrder` under `purchase_order.approve`; requisition
approve/submit). Status is displayed and filterable on every list. **Surfacing approve/receive as buttons on
a PO detail page is the remaining enhancement** — the server actions are in place; only the detail-page UI is
pending. No dead buttons remain on the procurement lists.

## Remaining
- PO/GRN detail pages with inline approve/receive actions (server actions ready).
- Requisitions list is real but has 0 seeded rows (empty state).

**Procurement status:** Client-demo-ready ✅ · Production-ready 🟡 (approval UI + detail pages pending).
