# CAP-SALES Architecture

## Core Paradigm
- **Event Sourcing**: The canonical truth is a sequence of immutable business facts (events), not a relational state table.
- **CQRS**: The Write Model (Commands/Aggregates) is strictly separated from the Read Model (Queries/Projections).
- **Outbox Pattern**: Integration events and downstream commands are persisted transactionally alongside domain events to guarantee exactly-once/at-least-once downstream delivery.

## Layers
1. **Domain**: Owns business rules and invariants (`SalesOrder` aggregate, `DomainEvent` base).
2. **Application**: Owns use-case orchestration (`CreateSalesOrderHandler`, `InventoryAcl`, `BillingAcl`). Strictly forbidden from housing business logic or DB SQL.
3. **Infrastructure**: Owns persistence and transport (`EventSourcedSalesOrderRepository`, `PostgresOrderFulfillmentProjection`).
