# CAP-INVENTORY Discovery Document v1.0

## Goal
Freeze the CAP-INVENTORY bounded context boundaries, mission, and stock movement model before writing a single line of implementation code.

## Architecture Discovery Sequence
1. **ADR-INV-001**: Inventory Mission Constitution (✅ Approved)
2. **ADR-INV-002**: Inventory Domain Boundaries (✅ Approved)
3. **ADR-INV-003**: Stock Movement Model (✅ Approved)
4. **ADR-INV-004**: Reservation Model (✅ Approved)
5. **ADR-INV-005**: Warehouse Model (✅ Approved)
6. **ADR-INV-006**: Valuation Ownership (✅ Approved)
7. **ADR-INV-007**: Integration Boundaries (🔄 Proposed Below)

---

# APPROVED: ADR-INV-001: Inventory Mission Constitution

## Status
Approved

## Context
CAP-INVENTORY is the central bounded context for all physical truth inside the ERP. Because multiple bounded contexts (Sales, Procurement, Manufacturing) interact with physical stock, Inventory must have absolute constitutional authority over its own ledger.

## Mission
The Inventory Bounded Context owns exactly one thing: **Physical Stock Truth and Availability**.

## Constitutional Rules

### 1. Physical Truth Over Commercial Intent
Inventory does not care *why* stock moved, only that it *did* move. Inventory commands (e.g., `InventoryDispatchRequested`) are instructions for physical action. The physical action (`StockDispatched`) is what mutates the inventory ledger, regardless of upstream commercial intent.

### 2. The Inventory Movement Ledger
All stock movements must mirror double-entry accounting principles but applied to physical quantities. The canonical truth is the **Inventory Movement Ledger** (not a state table). Everything else is derived from these ledger events.

### 3. Valuation Facts, Not Decisions
Inventory owns Quantity Truth. Inventory may calculate Cost Facts according to approved costing policies (e.g. emitting `StockIssued` with `Quantity`, `UnitCost`, `ExtendedCost`). However, Inventory does not own General Ledger interpretation. It must never emit business decisions like `StockValuationDetermined`.

### 4. Availability Is Inventory Truth
Only CAP-INVENTORY determines Available Quantity, Reserved Quantity, On-Hand Quantity, and In-Transit Quantity. No external bounded context (Sales, Procurement) may calculate availability.

---

# APPROVED: ADR-INV-002: Inventory Domain Boundaries

## Status
Approved

## Mission
Answer exactly what belongs to Inventory and what absolutely does not. Define the strict demarcation between physical reality and surrounding domains.

## 1. Constitutional Rule: Inventory Never Asks Why
Inventory only asks:
- *What moved?*
- *How much moved?*
- *From where?*
- *To where?*
- *When?*

Inventory **never** asks:
- *Why was it sold?*
- *Why was it purchased?*
- *Why was it manufactured?*

This single rule severs physical reality from commercial intent, preventing 90% of ERP architectural coupling.

## 2. In-Domain Ownership (What Inventory Owns)
Freeze these as constitutional physical truths:
- **Physical Stock States**: On Hand Quantity, Available Quantity, Reserved Quantity, Damaged Quantity, Quarantined Quantity, In Transit Quantity.
- **Physical Locations**: Warehouse, Bin, Shelf, Zone, External Location, Transit Location.
- **Physical Identity**: Lot Numbers, Batch Numbers, Serial Numbers.
- **Physical Events**: Received, Reserved, Released, Picked, Packed, Dispatched, Transferred, Adjusted, Counted, Returned, Scrapped.

## 3. Forbidden Responsibilities (What Inventory Does NOT Own)
Inventory does not own commercial, financial, or manufacturing logic:
- **Sales**: Orders, Customers, Pricing, Discounts, Quotes.
- **Procurement**: Supplier Contracts, Negotiation, Vendor Pricing.
- **Finance**: Journal Entries, GL Accounts, Revenue Recognition, AR/AP.
- **Manufacturing**: Production Planning, Routing, Work Centers.

## 4. Ownership Matrix & Boundaries

| Bounded Context | CAP-INVENTORY Owns | The External Context Owns |
| :--- | :--- | :--- |
| **Sales** | Physical dispatch, Reservations, Availability | Commercial commitment, Order lifecycle |
| **Procurement** | Physical receipt, Put-away, Quarantines | Purchase orders, Supplier compliance |
| **Finance** | Stock quantity changes, Cost Facts | Sub-ledgers, Journal mapping, AP/AR |
| **Manufacturing**| Physical consumption, Physical yield | Work center routing, Bills of Material |

---

# APPROVED: ADR-INV-003: Stock Movement Model

## Status
Approved

## Mission
Answer: *What is the atomic truth of Inventory?*

The canonical truth must be the **Inventory Movement Ledger**—a continuous sequence of double-entry stock movements—exactly analogous to Journal Entries in Finance. State entities like `Inventory Item`, `Stock Balance`, and `Warehouse Quantity` are derived projections, not truth.

## Constitutional Rules

### 1. No Direct Quantity Mutation
It is forbidden to mutate stock states directly (e.g., `product.quantity += 10`, `warehouse.stock = 100`). Inventory state must only change through immutable Stock Movements.

### 2. Every Movement Has Two Endpoints
Stock never appears from nowhere or disappears into nowhere. Every movement must specify `FROM`, `TO`, and `QUANTITY` (e.g., `Main Warehouse` → `Customer`, or `Supplier` → `Main Warehouse`).

### 3. Inventory Is A Ledger
The canonical event is `StockMoved`. This is the fundamental atomic unit of physical truth.

### 4. Balances Are Derived
We never persist `WarehouseQuantity`, `AvailableQuantity`, or `OnHandQuantity` as the canonical source of truth. Projections may exist for performance, but the absolute truth is always `SUM(StockMoved)`.

### 5. Movement Types Are Metadata
`movementType` explains the business context (e.g., `RECEIPT`, `DISPATCH`), but the ledger mathematics come exclusively from `FROM`, `TO`, and `QUANTITY`. Movement types must never change the mathematical rules of the ledger.

### 6. Movement Immutability
Once a movement enters the Inventory Movement Ledger, it can never be modified and never be deleted. Corrections must occur strictly via **Compensating Movements** (e.g. `Quantity = -20`), precisely mimicking financial Journal Entries.

## Models and Taxonomies

### Core Ledger Model
```typescript
interface StockMoved {
    movementId: string;
    productId: string;
    quantity: number;
    fromLocationId: string;
    toLocationId: string;
    movementType: MovementType;
    occurredAt: Date;
}
```

### Location Taxonomy
The universe of physical and logical locations includes: Warehouse, Bin, Transit, Customer, Supplier, Production, Quarantine, Scrap.

### Movement Taxonomy
Allowed context categories: RECEIPT, DISPATCH, TRANSFER, RETURN, ADJUSTMENT, SCRAP, QUARANTINE, RELEASE.

### Derived State Examples
All balances are mathematically computed from the ledger:
- **On-Hand**: `SUM(movements into Warehouse/Bin) - SUM(movements out of Warehouse/Bin)`
- **In-Transit**: `SUM(movements into Transit) - SUM(movements out of Transit)`
- **Damaged**: `SUM(movements into Scrap/Quarantine) - SUM(movements out of Scrap/Quarantine)`
- **Available**: `OnHand - Reserved` (Reservations defined in ADR-INV-004)

### Forbidden Models
Explicitly rejected architectural patterns:
- `InventoryBalanceTable` as Truth
- `Product.quantity` as Truth
- `Warehouse.quantity` as Truth

---

# APPROVED: ADR-INV-004: Reservation Model

## Status
Approved

## Mission
Answer: *What is a reservation?*
A reservation is a temporary claim against future availability. It is strictly not a stock movement, and it is not an availability calculation (since availability depends on reservations).

## Constitutional Rules

### 1. Reservation Is A Claim
A reservation does not move stock. It is purely a claim against future physical capacity.

### 2. Reservation Cannot Mutate Ledger
Reservations must never create `StockMoved` events. The physical movement ledger remains completely untouched by reservations.

### 3. Reservation Is Separate Truth
Inventory operates on two distinct ledgers:
- **Truth A (Movement Ledger)**: Records physical reality.
- **Truth B (Reservation Ledger)**: Records future claims.
These two truths must never be commingled.

### 4. Availability Formula
Availability is mathematically deterministic:
`Available = OnHand (from Movement Ledger) - Reserved (from Reservation Ledger)`
Never the reverse.

### 5. Reservation Lifecycle
Claims progress through a strict state machine:
- `CREATED`: Claim exists.
- `ALLOCATED`: Inventory has promised quantity.
- `RELEASED`: Claim removed (without fulfillment).
- `EXPIRED`: Claim timed out.
- `FULFILLED`: Physical movement occurred satisfying the claim.

### 6. Fulfillment Does Not Delete Reservation
Reservations are never deleted. When fulfilled, they transition to `FULFILLED`, leaving a permanent historical trace for auditability.

### 7. Reservation Ownership
Inventory has exclusive ownership over Reservation Quantity, State, and Availability Checks. External domains (Sales, Procurement, Manufacturing) can request reservations, but Inventory retains sovereign right to decide.

### 8. Reservation Immutability
Reservations must mirror movement immutability. It is forbidden to silently update an existing reservation (`UPDATE Reservation SET quantity = 50`). Changes must be enacted via compensating events (e.g., `ReservationReleased`, `ReservationCreated`, or an explicit `ReservationAdjusted` event). This preserves replayability exactly like the Movement Ledger.

## Models and Taxonomies

### Core Reservation Model
```typescript
interface Reservation {
    reservationId: string;
    productId: string;
    quantity: number;
    sourceLocationId: string;
    status: 'CREATED' | 'ALLOCATED' | 'RELEASED' | 'EXPIRED' | 'FULFILLED';
    createdAt: Date;
    expiresAt?: Date;
}
```

### Reservation Events
- `ReservationCreated`
- `ReservationAllocated`
- `ReservationReleased`
- `ReservationExpired`
- `ReservationFulfilled`

### Forbidden Models
- `reserved_quantity` column as canonical truth.
- `inventory_item.reserved += 5`
- `warehouse.available -= reservation`
These can exist only as derived CQRS read models (projections), never as primary truth.

## Certification Success Test
If all projection tables are destroyed, the ERP must be able to exactly rebuild `OnHand`, `Reserved`, and `Available` using only the `Movement Ledger` + `Reservation Ledger`, with 100% mathematical fidelity.

---

# APPROVED: ADR-INV-005: Warehouse Model

## Status
Approved

## Mission
Answer: *What is a warehouse?*
The answer must not be "a place that stores quantity." The answer is: **A node within the inventory location graph.**

## Constitutional Rules

### 1. Warehouses Are Locations
A warehouse owns Identity, Hierarchy, Topology, and Capabilities. It does **NOT** own Quantity Truth, Availability Truth, Reservations, or Valuation. These quantities are strictly derived from the ledgers.

### 2. Inventory Exists In Locations
Stock never exists abstractly inside a "Product". Stock exists strictly inside a Location.
- **Wrong**: `Product P1 = 100 Units`
- **Correct**: `Location A = 60 Units of P1`, `Location B = 40 Units of P1`

### 3. Hierarchical Location Model
Locations naturally form a hierarchy. Movements may occur at any level of granularity.
- Minimum structure: `Warehouse` -> `Zone` -> `Bin`

### 4. Logical And Physical Locations
Inventory must support both physical and logical locations as first-class citizens without special-casing them.
- **Physical**: Warehouse, Zone, Bin, Shelf
- **Logical**: Transit, Quarantine, Scrap, Customer, Supplier, Production

### 5. Location Immutability
Location IDs must be permanently immutable. Reusing or renaming locations breaks historical replayability.
- **Wrong**: Rename location and reuse identifier.
- **Correct**: Create new location, retire old location.

### 6. Location Graph
Warehouses must not be modeled merely as a simple top-down tree. They must be modeled as a **Location Graph**. A transfer from `Warehouse A` -> `Transit` -> `Warehouse B` is a graph traversal.

## Models and Taxonomies

### Core Location Model
```typescript
interface InventoryLocation {
    locationId: string;
    parentLocationId?: string;
    locationType:
        | 'WAREHOUSE'
        | 'ZONE'
        | 'BIN'
        | 'TRANSIT'
        | 'QUARANTINE'
        | 'SCRAP'
        | 'CUSTOMER'
        | 'SUPPLIER'
        | 'PRODUCTION';
    active: boolean;
}
```

### Location Events
The minimal event catalog contains topology events, never quantity events:
- `LocationCreated`
- `LocationActivated`
- `LocationDeactivated`
- `LocationMoved`

### Forbidden Models
Explicitly reject any location that caches its own truth:
- `warehouse.quantity`
- `warehouse.available`
- `warehouse.reserved`
- `warehouse.stock`
These values may exist purely as CQRS projections.

## Certification Success Test
If all warehouse balance tables are deleted, can the ERP mathematically rebuild all stock positions solely from the `Movement Ledger` + `Location Graph` + `Reservation Ledger`?
The answer must be **Yes**.

---

# APPROVED: ADR-INV-006: Valuation Ownership

## Status
Approved

## Mission
Answer: *Who owns inventory valuation?*
Inventory owns **Quantity Truth**, **Movement Truth**, and **Cost Facts**.
Inventory does **NOT** own Financial Interpretation, GL Impact, Accounting Policy, or Financial Reporting.

## Constitutional Rules

### 1. Inventory Owns Cost Facts
Inventory determines factual cost values (`Unit Cost`, `Extended Cost`, `Cost Layer`, `Costing Method Used`).
*Example:* 100 units received @ $10. Inventory Fact: `Quantity = 100, Unit Cost = $10, Extended Cost = $1000`.

### 2. Finance Owns Meaning
Inventory must never decide the financial accounting treatment (Expense Account, COGS Account, Inventory Asset Account, Revenue Recognition, Tax Treatment).
Inventory emits `StockIssued` fact. Finance decides to Debit COGS and Credit Inventory Asset. Inventory must never emit journal entries.

### 3. Cost Facts Must Be Reproducible
Given the `Movement Ledger` + `Cost Policy`, the system must always exactingly regenerate Unit Cost, Extended Cost, and Remaining Cost Layers. Determinism is mandatory.

### 4. Costing Policy Is Explicit
Supported policies (FIFO, Weighted Average, Specific Identification) must be frozen and explicitly identified in every valuation via `CostingMethod`. Magic calculations, custom SQL, or manual overrides are forbidden.

### 5. Cost Layers Are Inventory Truth
Inventory explicitly owns Cost Layers, Remaining Layer Quantity, and Layer Consumption (especially for FIFO). These are inventory facts that Finance merely consumes.

### 6. Valuation Events Are Facts
Inventory emits pure facts (e.g., `StockReceived`, `StockIssued`), never financial conclusions (`InventoryAssetAdjusted`, `COGSRecognized`). Financial conclusions belong exclusively to Finance.

### 7. No Accounting Logic In Inventory
It is a hard architectural violation for Inventory to contain logic like `createJournalEntry()`, `postToGL()`, `calculateCOGSAccount()`, or `determineExpenseAccount()`.

### 8. Cost Layer Immutability
Cost layers must mirror the philosophy of the Movement Ledger and Reservation Ledger. It is forbidden to silently update (`UPDATE CostLayer`) or delete a layer. Instead, utilize events like `CostLayerCreated`, `CostLayerConsumed`, and `CostLayerAdjusted`.

## Models and Taxonomies

### The Cost Layer Ledger
Inventory now operates three fundamental ledgers:
1. **Movement Ledger** = Quantity Truth
2. **Reservation Ledger** = Future Claims Truth
3. **Cost Layer Ledger** = Value Truth
These ledgers must remain separable and independently rebuildable.

### Core Models
```typescript
interface CostLayer {
    layerId: string;
    productId: string;
    remainingQuantity: number;
    unitCost: number;
    sourceMovementId: string;
    createdAt: Date;
}

interface StockIssued {
    movementId: string;
    quantity: number;
    unitCost: number;
    extendedCost: number;
    costingMethod: string;
}
```

### Event Catalog
The minimal valuation event catalog contains pure facts:
- `CostLayerCreated`
- `CostLayerConsumed`
- `StockValuationCalculated` (An inventory fact, NOT a finance posting)
- `StockIssued`

### Forbidden Designs
- **Inventory posts GL entries.**
- **Inventory owns the Chart of Accounts.**
- **Inventory decides COGS.**
- **Finance recalculates inventory valuation independently.**
Both domains must not maintain competing valuation truths.

## Certification Success Test
ADR-INV-006 is correct only if we can simultaneously answer **Yes** to both of these questions:
1. If Finance disappears entirely, can Inventory still reconstruct every historical quantity and cost fact using solely the `Movement Ledger` + `Cost Layer Ledger` + `Valuation Policy`?
2. If Inventory emits a `StockIssued` fact, can Finance generate journal entries without recalculating the inventory valuation?

---

# PROPOSED: ADR-INV-007: Integration Boundaries

## Status
Proposed

## Mission
Answer: *How may external bounded contexts interact with Inventory?*
The answer must be: **Only Through Contracts, Never Through Internal Models.**

## Constitutional Rules

### 1. Inventory Is Sovereign
External domains may *request*. Inventory *decides*.
- **Sales requests**: Reserve Inventory, Dispatch Inventory, Release Reservation.
- **Procurement requests**: Receive Inventory, Put Away Inventory.
- **Manufacturing requests**: Consume Inventory, Return Inventory.
- **Finance requests**: Valuation Facts.
None of them may mutate Inventory directly.

### 2. No Shared Database
Explicitly forbidden:
- Sales reads/updates Inventory tables directly.
- Procurement updates Inventory tables.
- Manufacturing updates Inventory tables.
- Finance updates Inventory tables.
All interactions occur strictly through **Commands**, **Events**, and **ACLs**. No exceptions.

### 3. Commands Enter Inventory
Inventory accepts commands as requests (e.g., `CreateReservation`, `AllocateReservation`, `ReceiveStock`, `DispatchStock`, `AdjustStock`). Commands are intent, not truth.

### 4. Events Leave Inventory
Inventory emits facts (e.g., `ReservationAllocated`, `StockMoved`, `StockIssued`). Events are undeniable truth and cannot be rejected after emission.

### 5. ACLs Translate Languages
External domains never speak Inventory language directly.
Sales language (`DeliveryCompleted`) must become Inventory language (`InventoryDispatchRequested`) through Anti-Corruption Layers (ACLs). This preserves bounded-context isolation.

### 6. Correlation Preservation
Every integration boundary must strictly preserve `correlationId` and `causationId` across Commands, Events, and ACLs. End-to-end lineage is mandatory for enterprise auditability.

### 7. Inventory Never Depends On Upstream State
It is strictly forbidden for Inventory to load external aggregates:
- No loading `SalesOrder`
- No loading `PurchaseOrder`
- No loading `WorkOrder`
- No loading `Invoice`
Inventory must operate solely from its own state + incoming contract data. This prevents distributed transactions.

### 8. Eventual Consistency Is Constitutional
Inventory must not require Distributed Transactions, 2-Phase Commits (2PC), or Cross-Service Locks.
Success path: `Command` -> `Inventory Decision` -> `Event` -> `External Reaction`.
Always eventually consistent.

## Integration Matrix

| Bounded Context | External Domain Owns | Inventory Owns |
| :--- | :--- | :--- |
| **Sales** | Commercial Commitment | Availability, Reservation, Dispatch |
| **Procurement** | Supplier Intent, Purchase Orders | Receipt, Put-away, Quarantine |
| **Manufacturing**| Production Planning, Routing, BOM | Consumption, Yield, Physical Movement |
| **Finance** | Journal Entries, Financial Statements | Cost Facts |

## Required Event Catalog
Freeze a minimum outbound catalog:
- `ReservationCreated`
- `ReservationAllocated`
- `ReservationReleased`
- `ReservationFulfilled`
- `StockReceived`
- `StockMoved`
- `StockTransferred`
- `StockDispatched`
- `CostLayerCreated`
- `CostLayerConsumed`
- `StockIssued`

## Explicitly Forbidden Designs
- Shared Database Integration.
- Cross-Context ORM Relationships.
- Inventory importing Sales, Procurement, or Finance aggregates.
- Synchronous Cross-Context Transactions.

## Certification Success Test
ADR-INV-007 is correct only if we can simultaneously answer **Yes** to both questions:
1. Can Sales, Procurement, Manufacturing, and Finance all be shut down independently without corrupting Inventory Truth?
2. Can Inventory be replayed from its own event streams without loading a single external aggregate?

> [!IMPORTANT]
> **User Review Required**: Please review `ADR-INV-007`. If approved, this completes the CAP-INVENTORY Discovery phase. We can then transition to the Inventory Architecture Strategy phase. Do you approve?
