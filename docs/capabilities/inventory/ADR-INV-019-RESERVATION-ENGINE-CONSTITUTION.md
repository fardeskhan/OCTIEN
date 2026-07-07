# ADR-INV-019: Reservation Engine Constitution

## Status
Approved

## Mission
Freeze the rules governing reservation lifecycle, allocation policies, and concurrency enforcement. This constitution guarantees that reservations coordinate safely across isolated aggregates and that overselling is mathematically impossible.

## Constitutional Rules

### 1. Reservation Ownership and Identity
The `ReservationAggregate` exclusively owns the reservation lifecycle. Every reservation must carry a strict identity invariant: `reservationId`, `tenantId`, `productId`, `sourceContext`, and `sourceReferenceId`.

### 2. Allocation Strategy
Allocation logic must never be hardcoded into the aggregate. It will be abstracted into a dedicated Domain Service: `ReservationPolicy`.

### 3. Partial Allocation Rules and Lifecycle
The reservation lifecycle state machine is:
**`CREATED → ALLOCATED | PARTIALLY_ALLOCATED → FULFILLED | EXPIRED | RELEASED`**

If a reservation becomes `PARTIALLY_ALLOCATED`, it explicitly owns `allocatedQuantity`, `requestedQuantity`, and `remainingQuantity`.
The invariant `requestedQuantity = allocatedQuantity + remainingQuantity` must always be strictly enforced.

### 4. Concurrency Rules (The Anti-Oversell Guarantee)
When allocating stock, optimistic concurrency via `expectedVersion` on the bucket is mandatory.
If a `ConcurrencyConflictException` is thrown, the `ReservationAllocationSaga` will automatically retry.
**Retry Limits**: `maxRetries = 5` with exponential backoff. After exhaustion, the allocation transitions to `PARTIALLY_ALLOCATED` (if partial is allowed) or `RELEASED` (failed).

### 5. Reservation Expiration
Aggregates have no clocks. Time originates from a Scheduler, Workflow Engine, or Saga. Expiration is explicitly triggered by an external chronometer issuing an `ExpireReservationCommand`.

### 6. Reservation Fulfillment
Fulfillment is triggered purely by physical truth (`StockMoved`).
When physical stock leaves the warehouse, a saga observes the dispatch and issues a `FulfillReservationCommand`.

### 7. Reservation Release
No reservation state transition may occur without an explicit `ReleaseReservationCommand`. This keeps lifecycle history auditable.

### 8. Certification Rules
- **CERT-RES-001 No Oversell**: 100 concurrent requests against `Available = 50` must result in exactly 50 allocated.
- **CERT-RES-002 Repeated Replay Determinism**: Destroy read models, replay events, verify state hashes. Repeat 10x. Hashes must match.
