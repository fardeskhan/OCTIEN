# ADR-INV-017: Event Store Constitution

## Status
Approved

## Mission
Freeze the foundational rules of event persistence. This Constitution guarantees that the event store remains append-only, mathematically determinable, explicitly ordered globally, and strictly decoupled from any specific underlying database technology (e.g., Postgres, EventStoreDB, Kafka).

## Constitutional Rules

### 1. Append-Only Streams
An event stream is an immutable ledger. `UPDATE` and `DELETE` operations are physically impossible and architecturally forbidden.

### 2. Absolute Immutability
Once an event is appended to the store, its payload and metadata are permanent.

### 3. Global Event Position
Every persisted event receives a monotonically increasing `globalPosition` assigned by the Event Store. This permanent global ordering mechanism is required for deterministic replayability across multiple streams and enables complete traceability.

### 4. Optimistic Concurrency is Mandatory
Every append operation must specify an `expectedVersion`. The event store must reject the transaction and throw a `ConcurrencyConflictException` if the actual version does not match the expected version, guaranteeing protection against overselling and race conditions.

### 5. Snapshots are Disposable
Snapshots exist purely for read-time performance optimization. They are never the source of truth. Any snapshot can be deleted at any time.

### 6. Snapshot Compatibility Validation
During snapshot load, the `schemaVersion` of the snapshot must be validated. If required, the snapshot must be explicitly upcasted or rejected. Loading a legacy snapshot directly into a modern aggregate object without validation is strictly prohibited.

### 7. Replay is First-Class
The ability to replay events is a primary architectural feature. The Replay Engine must never call aggregate commands; it only applies historical events (`applyEvent`). Generating new events during replay is forbidden, as that would violate determinism.

### 8. Upcasters are Mandatory and Pure
Event schemas will evolve (`v1` to `v2`). Legacy events in the store are never migrated in place. "Upcasters" dynamically transform old event structures into modern structures during read time. Upcasters must be **pure functions**: no database access, no external services, no repositories. Input is the Old Event, Output is the New Event.

### 9. Outbox Atomicity
Event storage and external notification must be transacted atomically via the Transactional Outbox Pattern (`BEGIN; INSERT event_store; INSERT outbox; COMMIT;`).
