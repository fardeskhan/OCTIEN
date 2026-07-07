# ADR-INV-021: ACL Constitution

## Status
Approved

## Mission
Freeze the rules governing how external bounded contexts communicate with Inventory. ACLs strictly act as translators and boundary guardians, guaranteeing that cross-domain interactions never share data models or leak business logic into the translator layer.

## Constitutional Rules

### Rule 1 — ACLs Translate, They Do Not Decide
The ACL's only job is to translate external events into Inventory Commands (or Inventory Events into External Commands).
- **Approved**: `Sales Event` → `ACL Translation` → `Inventory Command`
- **Forbidden**: `Sales Event` → `ACL Business Logic` → `Inventory Command`
An ACL must never enforce inventory rules, make valuation decisions, or hold internal state.

### Rule 2 — No Shared Models
No external DTOs (e.g., `SalesOrderDTO`) may cross the ACL boundary into the Inventory domain.
Every ACL must map the `External Model` to a `Canonical Translation`, which then maps to an `Inventory Command/Event`. The Inventory domain remains completely ignorant of external types.

### Rule 3 — Correlation Preservation
Every ACL translation MUST strictly preserve and forward:
- `tenantId`
- `correlationId`
- `causationId`

This guarantees end-to-end traceability across multiple distributed capability pipelines.

### Rule 4 — ACL Failure Isolation
An ACL outage (e.g., the `Finance ACL` going down) must NEVER halt core Inventory operations. ACLs process asynchronously and may retry translations, but `Reservation`, `Dispatch`, and `Consumption` must continue unaffected.

---

## Contract Registry and Versioning
All translations must be explicitly registered via a bidirectional `ACLContractRegistry`.
Contracts must be explicitly versioned (e.g., `SalesOrderConfirmed v1`, `v2`).

```typescript
export interface ACLContract {
  contractName: string;
  contractVersion: string;
}

export interface ACLContractRegistry {
  registerInbound(contract: ACLContract, translator: (externalEvent: any) => any): void;
  registerOutbound(contract: ACLContract, translator: (internalEvent: any) => any): void;
  
  translateInbound(contract: ACLContract, externalEvent: any): any;
  translateOutbound(contract: ACLContract, internalEvent: any): any;
}
```

---

## ACL Catalog

### 1. `SalesInventoryACL`
- **Consumes**: `SalesOrderConfirmed`, `OrderCancelled`, `DeliveryCompleted`, `ReturnReceived`
- **Produces**: `CreateReservation`, `ReleaseReservation`, `DispatchInventory`, `ReceiveReturn`

### 2. `ProcurementInventoryACL`
- **Consumes**: `PurchaseOrderApproved`, `GoodsArrived`, `SupplierReturnRequested`
- **Produces**: `ReceiveInventory`, `PutAwayInventory`, `ReturnInventoryToSupplier`

### 3. `ManufacturingInventoryACL`
- **Consumes**: `ProductionStarted`, `MaterialConsumptionRequested`, `ProductionCompleted`
- **Produces**: `ReserveInventory`, `ConsumeInventory`, `ReceiveFinishedGoods`

### 4. `InventoryFinanceACL`
- **Consumes**: `StockIssued`, `CostLayerConsumed`, `CostLayerAdjusted`
- **Produces**: `CreateJournalEntry`, `CreateCOGSPosting`, `UpdateInventoryAsset`

*(Note: Additional ACLs like Shipping/Warehouse are deferred until those capabilities are formally created.)*

---

## ACL Certification Standards

- **CERT-ACL-001 Translation Determinism**: Passing the exact same external event 100 times must yield the exact same Inventory Command payload 100 times.
- **CERT-ACL-002 Domain Isolation**: We will synthetically mutate the incoming external schema in the test environment. After updating the ACL, we will verify that 0 lines of Inventory Core code require modification.
- **CERT-ACL-003 Correlation Integrity**: We will initiate an event in "Sales", pass it through the ACL to Inventory, have Inventory emit a Valuation Fact, and pass that to the Finance ACL. We will verify that `correlationId`, `causationId`, and `tenantId` survive perfectly intact at the destination.
- **CERT-ACL-004 Contract Evolution Certification**: The registry must contain both `v1` and `v2` of a contract. Both must translate correctly without breaking the core domain.
