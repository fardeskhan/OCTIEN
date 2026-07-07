# ADR-INV-018: Projection Constitution

## Status
Approved

## Mission
Freeze the rules governing all query read models within CAP-INVENTORY. Ensure that projections remain exclusively derived, disposable, strictly isolated from transactional business logic, and versioned for reliable replay at enterprise scale.

## Constitutional Rules

### 1. Projection = Disposable Cache
Projections are read-optimized caches. They hold no absolute truth. Truth remains exclusively within the Movement Ledger, Reservation Ledger, Cost Layer Ledger, and Location Streams. Any projection must be safely destructible at any time.

### 2. Explicit Ownership and Sourcing
Every projection must explicitly declare its Owner, Source Streams, and Rebuild Procedure. There are no anonymous projections.

### 3. Projection Failure Isolation
A failure in a projection (e.g., database timeout) must NEVER cause a business failure. The write-side (Command → Aggregate → Event Store) must continue independently. Broken projections simply fall behind and can be rebuilt later.

### 4. Projection Determinism (Idempotency)
`Projection.apply(event)` must be strictly idempotent. If the projection processes `StockMoved #123` multiple times, the resulting state must be exactly the same as if it processed it once.

### 5. Projection Storage Rule
Never store event truth (raw payloads) inside projections. Projections may only persist the derived state optimized for queries.

### 6. Projection Watermark Constitution
Large-scale replay requires resumption and version detection. The Projection Engine must maintain a `ProjectionCheckpoint` containing:
- `projectionName: string`
- `projectionVersion: string`
- `lastGlobalPosition: number`
- `updatedAt: string`

When a projection's version is updated (e.g., `v1` to `v2`), the engine must enforce a Full Rebuild rather than Catch Up.

### 7. Projection DLQ
Projection failures must be isolated. If a projection cannot process an event, the event is routed to a `ProjectionDeadLetterQueue` for alerting. The projection does not silently skip the event, nor does it crash the system.

### 8. Certification Rule: CERT-PROJ-001
The implementation must pass the following test:
1. Delete every projection table.
2. Replay all events from the event store.
3. Verify that the resulting state hashes match the prior state exactly.
