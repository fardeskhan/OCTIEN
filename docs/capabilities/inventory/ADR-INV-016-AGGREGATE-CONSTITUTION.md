# ADR-INV-016: Aggregate Implementation Constitution

## Status
Approved

## Mission
Ensure absolute purity of the CAP-INVENTORY aggregate implementation by preventing domain logic leakage and external dependencies.

## Constitutional Rules

### 1. Pure Event-Sourced State Transitions
Aggregate state changes **only through events**. An aggregate command method must never mutate internal state directly. The command method may only validate invariants and emit events. The state mutation must happen exclusively in the `applyEvent` (or equivalent) handler. This guarantees that rehydrating from the event store and executing a command follow the exact same state transitions.

### 2. No Repositories
An aggregate **never calls repositories**. It cannot fetch data from a database. All necessary state must be contained within the aggregate boundaries or passed into the command.

### 3. No Projections
An aggregate **never calls projections**. Projections are eventually consistent read models; relying on them within the aggregate write-model violates determinism and strict consistency.

### 4. No ACLs
An aggregate **never calls ACLs**. Translation happens at the application/boundary layer before the command reaches the aggregate.

### 5. No External Services
An aggregate **never calls external services** (HTTP, gRPC, messaging queues). It is a pure, isolated TypeScript class.

### 6. Event Emission Only
An aggregate **emits events only**. It validates rules, creates an event, wraps it in the authorized `EventEnvelope`, and returns or appends it. It does not perform I/O.
