# ADR-PROC-005: Receiving Model Constitution

## Status
Frozen

## Mission
Define exactly how commercial commitments become physical receipts without violating domain ownership. Procurement and Inventory must remain definitively decoupled while cooperating to resolve fulfillment.

---

## 1. Core Receiving Doctrine
- **Procurement Requests**
- **Inventory Verifies**
- **Inventory Records**

**CRITICAL RULE**: Procurement must NEVER record physical inventory.

## 2. Receiving Is Not Purchasing
A Purchase Order approval does NOT mean inventory exists.
- `PO = 100 Units` does NOT equate to `Inventory +100`.
- Only explicitly authorized Inventory events (e.g. `InventoryReceived`) are permitted to increment physical stock levels.

## 3. Receiving Requests Are Intent
When Procurement expects a delivery, it emits intent:
- Procurement event: `GoodsReceiptRequested` (represents a commercial expectation).
- Inventory later decides whether it is `Accepted`, `Rejected`, or `Partial` based on physical reality.

## 4. Physical Truth Always Wins
Inventory events are the ultimate authority for quantities.
- If `PO = 100`, `Expected = 100`, and `Received = 92`:
  - **Inventory** definitively records `92`.
  - **Procurement** must update its fulfillment state exclusively from the Inventory truth. Procurement cannot dictate physical quantities to the warehouse.

## 5. Variance Ownership
When the physical truth diverges from the commercial expectation:
- **Inventory** owns recording the actual quantity fact.
- **Procurement** owns the Commercial Resolution of the variance.
  - Examples: Short Shipment, Over Shipment, Wrong Product, Damaged Goods.

## 6. Over-Receipt Decision
If `PO = 100` and `Received = 110`:
- Inventory records `110` unconditionally. (Reality cannot be discarded; if the physical stock is on the dock, it exists).
- Procurement opens a variance workflow to determine acceptance (e.g., return to supplier, accept excess charge).

## 7. Event Ownership Classification
Event ownership is strictly separated to maintain bounded context integrity:
- **Procurement Events**: `GoodsReceiptRequested`, `ReceiptRequestCancelled`
- **Inventory Events**: `InventoryReceived`, `InventoryPartiallyReceived`, `InventoryRejected`, `InventoryReturned`

## 8. Aggregate Implications
- Receiving does **not** need its own aggregate.
- The `PurchaseOrderAggregate` directly owns the **Receipt Progress** (tracking `ReceivedQuantity` and `RemainingQuantity`) derived from Inventory events.

## 9. Discovery Certifications
- `CERT-PROC-009 Receipt Reconciliation Integrity`: Guarantees that PO Receipt Progress = Inventory Reality.
- `CERT-PROC-010 Variance Resolution Integrity`: Guarantees that all Receiving Variances are traceable and auditable.
