# CAP-INVENTORY Architecture Strategy v1.0.0

## Architecture Strategy Sequence
1. **INV-ARCH-001**: Inventory Aggregate Strategy (✅ Approved)
2. **INV-ARCH-002**: Event Stream Strategy (✅ Approved)
3. **INV-ARCH-003**: Projection Strategy (✅ Approved)
4. **INV-ARCH-004**: ACL Strategy (✅ Approved)
5. **INV-ARCH-005**: Enterprise Certification Strategy (✅ Approved)

---

# APPROVED: INV-ARCH-001: Inventory Aggregate Strategy
## Mission
Answer: *What are the aggregates?*
CAP-INVENTORY employs multiple aggregates, strictly separating Ledger Truth from Consistency Boundaries.

## The Authorized Aggregates
### 1. InventoryBucketAggregate
- **ID**: `productId-locationId` (e.g., `PROD1-WH1`)
- **Role**: Consistency Boundary for Availability and Allocation.
- **Constitutional Principle**: The Bucket is a consistency boundary, NOT a source of truth. Truth remains the Movement and Reservation Ledgers. The Bucket enforces rules like `Reserve 400` synchronously to prevent overselling, but it does not claim to be the canonical truth of stock.

### 2. ReservationAggregate
- **ID**: `reservationId`
- **Role**: Manages the state machine and lifecycle of a claim (`CREATED`, `ALLOCATED`, `RELEASED`, `FULFILLED`).

### 3. CostLayerAggregate
- **ID**: `layerId`
- **Role**: Manages valuation truth (FIFO, Average Cost, Consumption logic).

### 4. LocationAggregate
- **ID**: `locationId`
- **Role**: Owns the topology, activation, and graph changes.

## Explicitly Rejected Aggregates
- **ProductInventoryAggregate (Global Product)**: Rejected. High-frequency facts must not share a global consistency boundary. A single product aggregate creates a massive operational bottleneck.
- **StockMovementAggregate (Fact masquerading as aggregate)**: Rejected. A movement is an immutable fact, not a long-lived consistency boundary. Aggregates that emit one event and never change are anti-patterns.

---

# APPROVED: INV-ARCH-002: Event Stream Strategy
## Mission
Answer: *How many streams exist? How are events mapped to ledgers?*

## 1. Constitutional Principle: Truth vs. Mechanics
Freeze this architecture rule:
- **Ledger Events = Truth**
- **Aggregate Events = Consistency Mechanics**
Never mix them. The ledger is never reconstructed by inferring state from bucket events.

## 2. The Ledger Streams (Truth)
### Stream: `inventory-ledger`
- **Canonical Event**: `StockMoved`
- **Role**: The absolute, atomic physical truth of inventory (Truth A).

### Stream: `reservation-{reservationId}`
- **Mapped Aggregate**: `ReservationAggregate`
- **Events**: `ReservationCreated`, `ReservationAllocated`, `ReservationReleased`, `ReservationExpired`, `ReservationFulfilled`
- **Role**: Forms the Reservation Ledger (Truth B).

### Stream: `costlayer-{layerId}`
- **Mapped Aggregate**: `CostLayerAggregate`
- **Events**: `CostLayerCreated`, `CostLayerConsumed`, `CostLayerAdjusted`
- **Role**: Forms the Cost Layer Ledger (Truth C).

### Stream: `location-{locationId}`
- **Mapped Aggregate**: `LocationAggregate`
- **Events**: `LocationCreated`, `LocationActivated`, `LocationDeactivated`, `LocationMoved`
- **Role**: Forms the Location Topology Graph.

## 3. The Aggregate Streams (Consistency Mechanics)
### Stream: `inventorybucket-{productId}-{locationId}`
- **Mapped Aggregate**: `InventoryBucketAggregate`
- **Events**: `BucketStockReceived`, `BucketStockDispatched`, `BucketStockTransferredOut`, `BucketStockTransferredIn`, `BucketAllocationReserved`, `BucketAllocationReleased`
- **Role**: These streams are purely for enforcing local consistency and availability rules. They are **not** the canonical truth of stock.

## 4. The Transfer Saga Flow
To prevent unbalanced ledgers during network or process failures, the ledger becomes balanced only when the saga successfully completes.
1. **Transfer Requested**: Saga initiates.
2. **InventoryBucket WH1**: Emits `BucketStockTransferredOut` (includes `movementId`).
3. **InventoryBucket WH2**: Emits `BucketStockTransferredIn` (includes `movementId`).
4. **Saga Completes**: Emits `StockMoved` to the `inventory-ledger` stream.

## 5. Snapshot & Replay Rules
- **InventoryBucket**: Snapshot every 100 events to optimize read-side state loading.
- **Ledgers/Other Aggregates**: No snapshots required.
- **Replay Absolute**: Destroying all relational projection tables and replaying the union of all streams must flawlessly rebuild all Location Topology, Availability, and Ledger state.

---

# APPROVED: INV-ARCH-003: Projection Strategy
## Mission
Answer: *What read models exist?*

## Constitutional Rules
### 1. Projections Are Disposable
- **Event Store = Truth**
- **Projection = Cache**
A projection holds no absolute truth and may always be destroyed without consequence.

### 2. Every Projection Has One Owner
There are no shared projections. Each projection must identify:
- Owner Aggregate (or Domain)
- Source Streams
- Rebuild Procedure

## Required Projection Set
1. **InventoryAvailabilityProjection**: Calculate `Available`, `OnHand`, and `Reserved`. (Sources: `Inventory Ledger` + `Reservation Ledger`)
2. **InventoryPositionProjection**: Map Product Position per Location. (Sources: `Inventory Ledger` + `Location Graph`)
3. **ReservationProjection**: Read Model for Reservation State, Lifecycle, and Allocation. (Sources: `Reservation Streams`)
4. **ValuationProjection**: Track Inventory Value, FIFO Layers, and Average Cost. (Sources: `Cost Layer Streams`)
5. **WarehouseViewProjection**: Warehouse Dashboards, Bin Utilization, and Location Capacity. (Sources: `Location Streams` + `Inventory Ledger`)

## Certification Requirement
**INV-ARCH-003** succeeds only if:
Executing a `DROP ALL PROJECTIONS` command, followed by `Replay All Streams`, exactly reconstructs identical results.

---

# APPROVED: INV-ARCH-004: ACL Strategy
## Mission
Answer: *How do external bounded contexts safely speak to Inventory?*
The answer must always remain: **Through Translation, Never Through Shared Models.**

## Constitutional Rules
1. **Inventory Language Is Sovereign**: External domains must never emit these commands or facts directly.
2. **Every Integration Requires An ACL**: There is absolute prohibition on direct integration.
3. **ACLs Must Be Pure Translators**: ACLs do not decide; they translate.
4. **Traceability Preservation**: Every ACL is strictly mandated to preserve `correlationId`, `causationId`, and `tenantId`.
5. **Failure Isolation**: An ACL failure must never corrupt Inventory or the external domain.

## Required ACL Catalog
1. **SalesInventoryACL**: Translate Commercial Commitments into Inventory Requests.
2. **ProcurementInventoryACL**: Translate Supplier Intent into Physical Receipts.
3. **ManufacturingInventoryACL**: Translate Production Intent into Inventory Movements.
4. **InventoryFinanceACL**: Translate Cost Facts into Accounting Facts.

---

# APPROVED: INV-ARCH-005: Enterprise Certification Strategy
Please refer to [ADR-INV-014: Enterprise Certification Constitution](ADR-INV-014-ENTERPRISE-CERTIFICATION.md) for the complete certification strategy and tests (CERT-001 through CERT-007).
