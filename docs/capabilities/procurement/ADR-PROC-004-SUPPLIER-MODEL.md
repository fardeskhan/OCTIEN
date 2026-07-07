# ADR-PROC-004: Supplier Model Constitution

## Status
Frozen

## Mission
Represent the commercial identity, qualification status, and operating relationship between the enterprise and a supplier. The Supplier Aggregate is strictly a business relationship aggregate localized to CAP-PROCUREMENT.

---

## 1. Supplier Aggregate Ownership

**The Supplier Aggregate exclusively owns**:
- `supplierId`
- `legalName`
- `displayName`
- `taxIdentifier`
- `status`
- `riskClassification`
- `paymentTerms` (Default Payment Terms)
- `commercialTerms` (Default Currency, Lead Time Expectations, Tax Treatment)
- `contactInformation`
- `preferredSupplierFlag`

**The Supplier Aggregate does NOT own**:
- Purchase Orders
- Invoices
- Payments
- Inventory
- Contracts

*(All cross-domain and inter-aggregate relationships are managed strictly by referencing the `supplierId`.)*

---

## 2. Supplier Lifecycle

The explicit state machine for a Supplier Aggregate:
`PROSPECT` → `UNDER_REVIEW` → `ACTIVE` → `SUSPENDED` → `TERMINATED`

*(Note: `UNDER_REVIEW` avoids overloading the transition from prospect to an actively trading partner by enforcing a qualification barrier.)*

### Lifecycle Invariants
- **Invariant 1**: Only `ACTIVE` suppliers may receive new Purchase Orders.
- **Invariant 3**: `TERMINATED` is strictly terminal. No reactivation is permitted; a new supplier must be created.

---

## 3. Supplier Risk Model

Risk Classification acts as an orthogonal overlay to the Supplier Status.

- **LOW**: Standard Operations.
- **MEDIUM**: Monitoring Required.
- **HIGH**: Executive Approval Required for new commitments.
- **BLOCKED**: No New Commitments allowed (prevents PO Creation and RFQ Award even if supplier status is `ACTIVE`).

*Invariant 2*: A `BLOCKED` risk classification supersedes an `ACTIVE` status for commitment creation.

---

## 4. Supplier Reference Integrity (`CERT-PROC-007`)

Every Purchase Order must reference a verifiably `ACTIVE` supplier.
Commitments generated against `PROSPECT`, `SUSPENDED`, or `TERMINATED` suppliers will be programmatically rejected by the aggregate invariant layer.

---

## 5. Future Scope Protection (Out of Scope for v1.0.0)

To prevent scope creep, the following capabilities are explicitly frozen as **OUT OF SCOPE** for CAP-PROCUREMENT v1.0.0 (Deferred to PROC-v2+):
- **Supplier Scorecards**: On-Time Delivery Metrics, Quality Ratings, Performance KPIs.
- **Supplier Contracts**: Master Agreements, Blanket Agreements, Rate Cards.
- **Supplier Portal**: Self-Service Updates, Document Upload, Order Acknowledgement UI.
