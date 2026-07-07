# ADR-INV-015: Event Contract Constitution

## Status
Approved

## Mission
Establish the permanent rules for event naming, versioning, metadata, traceability, and replay compatibility. The constitution must exist before the language of CAP-INVENTORY is defined.

## Constitutional Rules

### 1. Event Naming Rules
- **Past Tense Mandatory**: Events are undeniable historical facts (e.g., `StockMoved`, `ReservationCreated`). Present/Future tense is strictly forbidden.
- **Domain Language**: Names must reflect physical or business reality, not database operations (e.g., `LocationActivated`, not `LocationStatusUpdated`).
- **Bucket Distinction**: All consistency-mechanic events originating from the `InventoryBucketAggregate` must be explicitly prefixed with `Bucket` to prevent confusion with canonical ledger events (e.g., `BucketStockTransferredOut`).

### 2. Event Versioning Rules
- **Explicit Versioning**: Every event must declare its schema version (e.g., `v1`).
- **Additive Evolution**: Adding new optional fields does not require a version bump.
- **Breaking Evolution**: Removing fields, renaming fields, or changing data types strictly requires a new version (e.g., `v2`).

### 3. Metadata Envelope Rules
Every event payload must be strictly wrapped inside a standardized enterprise envelope containing:
- **Identity & Sequence**: `eventId` (UUID), `aggregateId`, `aggregateType`, `streamId`, `sequenceNumber`. This guarantees deterministic replay and explicit lineage.
- **Type & Version**: `eventType`, `eventVersion`, `schemaUri`.
- **Producer**: `producer` (Identifies the aggregate/module generating the event).
- **Time**: `timestamp` (ISO-8601 UTC).

### 4. Explicit Quantity Rule
Inventory systems eventually require fractional quantities, decimal exactness, and varied units. It is strictly forbidden to store quantities as raw `number` primitives in event payloads. All quantities must use the `Quantity` value object:
```typescript
{
  amount: string; // Precision-safe decimal string
  unitOfMeasure: string;
}
```

### 5. Correlation & Causation Rules
Traceability is mandatory.
- `correlationId`: Links the entire end-to-end enterprise transaction.
- `causationId`: Links this event directly to its immediate trigger.

### 6. Tenant Rules
- `tenantId`: Mandatory in every envelope. CAP-INVENTORY is natively multi-tenant. Events across tenants must be completely cryptographically partitioned.

### 7. Replay Compatibility Rules
- **Absolute Immutability**: Once written to the stream, an event's JSON is permanent.
- **Upcasting**: Schema migrations are handled via Upcasters (read-time transformations from `v1` to `v2`) to ensure legacy streams can always be projected into modern read models.
