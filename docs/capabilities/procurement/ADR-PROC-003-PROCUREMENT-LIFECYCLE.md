# ADR-PROC-003: Procurement Lifecycle

## Status
Frozen

## Mission
Define the explicit state-machine and invariant transitions governing Purchase Orders and Requests for Quotation (RFQs) to prevent ambiguous commercial status and ensure deterministic replays.

---

## 1. Purchase Order Lifecycle

**Standard Path**:
`DRAFT` → `SUBMITTED` → `APPROVED` → `ORDERED` → `PARTIALLY_RECEIVED` → `RECEIVED` → `CLOSED`

**Exceptional Paths**:
`REJECTED`, `CANCELLED`

### Invariant Rules
- **Invariant 1**: Only an `APPROVED` PO can transition into `ORDERED`.
- **Invariant 2**: Only an `ORDERED` PO can transition into `PARTIALLY_RECEIVED` or `RECEIVED`.
- **Invariant 3**: `CLOSED` is strictly terminal. No reopening, no rollback.
- **Invariant 4**: `REJECTED` is strictly terminal.
- **Invariant 5**: `CANCELLED` is strictly terminal.

### Receipt Progress Ownership (Partial Receipts)
If a PO of 100 receives shipments of 40, 35, and 25:
- **Decision**: `PARTIALLY_RECEIVED` is tracked as **Stored Aggregate State** inside the `PurchaseOrderAggregate`, *not* as a dynamically derived projection calculated on the fly.
- **Reason**: Procurement commitments must definitively understand and persist their own fulfillment progress without replaying Inventory projections.

---

## 2. Request For Quotation (RFQ) Lifecycle

To avoid ambiguity in early-stage demand translation, RFQs enforce the following terminal and standard paths:

**Path**:
`DRAFT` → `PUBLISHED` → `RESPONSES_RECEIVED` → `AWARDED`

**Exceptional Path**:
`CANCELLED`
