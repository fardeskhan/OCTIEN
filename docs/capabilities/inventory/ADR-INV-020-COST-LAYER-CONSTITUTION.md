# ADR-INV-020: Cost Layer Constitution

## Status
Approved

## Mission
Freeze the rules governing inventory valuation, cost layer lifecycle, and consumption strategies. This constitution formally enforces the boundary between physical valuation (Inventory) and financial accounting (Finance) while ensuring that historical costs remain mathematically determinable.

## Constitutional Rules

### 1. Valuation Ownership vs. Financial Ownership
- **Inventory Capability** exclusively owns *Valuation Facts*: The existence of cost layers, the physical consumption of those layers, and the calculation of unit cost and total asset value based on physical reality.
- **Finance Capability** exclusively owns *Accounting Truth*: Journal Entries, Account Numbers, GL Postings, and Accounting Policies.
- *Invariant*: The Cost Layer Engine must never generate or know about Journal Entries, Ledgers, or Account Codes.

### 2. Supported Costing Strategies
The system explicitly supports multiple costing strategies via the `CostingPolicy` abstraction:
- **FIFO (First-In, First-Out)**: The default standard.
- **Weighted Average Cost (WAC)**: Averaged dynamically.
- **LIFO (Last-In, First-Out)**: **EXPLICITLY PROHIBITED**. Due to IFRS compliance, deterministic replayability, and simpler certification, LIFO is intentionally unsupported.

### 3. Cost Layer Lifecycle and Identity
Every cost layer permanently owns its origin identity: `layerId`, `tenantId`, `productId`, `locationId`, `receiptReference`, and `receiptTimestamp`.

The lifecycle states are:
**`CREATED → ACTIVE → ADJUSTED → ACTIVE → CLOSED`**
A layer transitions to `CLOSED` when `remainingQuantity` equals 0. A layer can be partially consumed many times while remaining `ACTIVE`.

### 4. Deterministic Consumption
Consumption must be deterministic. The `CostConsumptionSaga` relies on the `CostingPolicy` to create a `ConsumptionPlan`. The Saga orchestrates calling `consumeCostLayer` on individual aggregates. Strategy logic never leaks into sagas.

### 5. Cost Adjustment Scenarios
Cost adjustments occur for real-world anomalies. They follow strict typing:
- **Type A (Supplier Cost Correction)**: Direct `CostLayerAdjusted`. (e.g. Invoice $12, PO $10).
- **Type B (Physical Inventory Recount)**: Must start with Inventory Adjustment -> Stock Movement -> Cost Impact. Quantity truth must change first.
- **Type C (Currency Revaluation)**: EXPLICITLY Finance's responsibility, NOT Inventory.

### 6. Cost Layer Replayability
Valuation must survive infrastructure loss. Destroying the `ValuationProjection` must never affect the `CostLayerAggregate` or `CostLayer Streams`.

### 7. Certification Rules
- **CERT-COST-001 FIFO Determinism**: 100 units consumed across 5 historical layers must drain the oldest layers sequentially down to a 0 remaining balance before touching the next chronological layer.
- **CERT-COST-002 Valuation Replay**: Destroy projections, replay events. The total resulting monetary asset value must match exactly.
- **CERT-COST-003 Layer Integrity**: Force a command to consume more than `remainingQuantity`. The Aggregate must reject it.
- **CERT-COST-004 Cost Revaluation**: Adjust a previously consumed layer (Supplier Correction). Ensure Replay is deterministic and valuation updates accordingly.
