# ADR-PROC-001: Procurement Mission Constitution

## Status
Frozen

## Mission
**Convert Organizational Demand into Supplier Commitments.**

CAP-PROCUREMENT exists to answer one question: *How does the enterprise acquire goods and services?*
Procurement owns the commercial intent, but it must strictly isolate itself from physical truth (owned by CAP-INVENTORY) and monetary truth (owned by CAP-FINANCE).

---

## Category
**Operational Procurement**

## Explicitly IN Scope (v1.0.0)
- **Purchase Requisitions**: Demand originates here.
- **Purchase Orders**: Commitments originate here.
- **RFQ Tracking**: Requesting quotes, receiving quotes, selecting suppliers.
- **Supplier Management**: Identity, Status, Risk Classification, Tax/Payment/Commercial Terms.
- **Goods Receipt Requests**: Emitting intent to receive physical goods.
- **Supplier Returns**: Emitting commercial intent to return goods.
- **Procurement ACLs**: Translating bounded context boundaries.

## Explicitly OUT OF Scope (v1.0.0)
- **Blanket Purchase Agreements**: Defers release orders, multi-year price schedules, and consumption tracking to a future capability (e.g., PROC-v2).
- **Strategic Sourcing**
- **Contract Management**
- **Spend Analysis & Analytics**
- **Supplier Performance Programs / Vendor Scorecards**
- **Procurement Auctions (Reverse Auctions / Tender Management)**
- **Vendor Portals**
- **Accounts Payable / Vendor Payments**: Owned by Finance.
- **Inventory Valuation**: Owned by Inventory.

---

## Constitutional Constraints

### 1. Demand vs. Commitment Separation
- Demand originates strictly in the **Purchase Requisition**.
- Commitment originates strictly in the **Purchase Order**.

### 2. Commercial Variance Ownership
- If `Purchase Order = 100` and `Received = 95`:
  - **Inventory** records the physical truth: `95 Received`.
  - **Procurement** owns the Commercial Variance Resolution (e.g., closing short, awaiting backorder, disputing with supplier).

### 3. Supplier Return Trilateral Ownership
Returns must strictly abide by the three-way separation:
- **Procurement**: Owns the Commercial Decision to Return.
- **Inventory**: Owns the Physical Movement of Returned Stock.
- **Finance**: Owns the Credit Notes and Financial Recovery.

---

## Certifications Enacted
- `CERT-PROC-001` Commitment Integrity
- `CERT-PROC-002` Supplier Lifecycle Integrity
- `CERT-PROC-003` Receipt Reconciliation
- `CERT-PROC-004` Replayability
- `CERT-PROC-005` Determinism
- `CERT-PROC-006` Domain Isolation
- `CERT-PROC-007` Supplier Reference Integrity (POs reference valid suppliers)
- `CERT-PROC-008` Commitment Replay Integrity (PO State = Replay Result)
