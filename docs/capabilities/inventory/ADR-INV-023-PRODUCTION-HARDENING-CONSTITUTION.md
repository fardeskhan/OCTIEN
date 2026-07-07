# ADR-INV-023: Production Hardening Constitution

## Status
Approved

## Mission
Establish the Six Certification Pillars of Operational Excellence. This constitution freezes the rules for observability, security, backup, performance, deployment topology, and operational runbooks necessary for CAP-INVENTORY to survive as a Tier-1 enterprise capability.

## The Six Certification Pillars

### PILLAR 1 — Observability & SLAs
**Mission**: *No invisible failures.* Every critical workflow must be observable and measured against frozen SLOs.
- **SLOs**:
  - **Reservation**: 95th Percentile < 500ms, 99th Percentile < 1000ms.
  - **ACL Translation**: 95th Percentile < 100ms.
  - **Projection Lag**: Normal Operation < 5 seconds.
  - **Replay**: 10 Million Events recovery < 4 Hours.
- **Metrics**: Must capture Reservation Success/Failure Rates, Projection Lag, Replay Duration, Replay Throughput, Cost Consumption Duration, ACL Translation Throughput, DLQ Size, Outbox Backlog, Snapshot Timings, and **Tenant Throughput** (Reservations/Tenant, Events/Tenant).
- **Structured Logs**: Every log entry MUST permanently bind `tenantId`, `correlationId`, `causationId`. Crucial domain IDs must be strictly indexed.
- **Distributed Tracing**: OpenTelemetry is the frozen standard. 

### PILLAR 2 — Operational Runbooks
Implicit knowledge is forbidden. Explicit operational runbooks must be created:
- **Runbook 001: Projection Rebuild**
- **Runbook 002: DLQ Recovery**
- **Runbook 003: Outbox Recovery**
- **Runbook 004: Snapshot Corruption Recovery**
- **Runbook 005: Tenant Recovery**
- **Runbook 006: Disaster Recovery**
- **Runbook 007: Regional Failover** (Single Region Supported, Multi-Region Compatible)
- **Runbook 008: Capacity Expansion**

### PILLAR 3 — Security Hardening
Inventory must become security certified:
- **Authentication**: OIDC / OAuth2 / JWT.
- **Authorization**: Strict RBAC model (`InventoryAdmin`, `InventoryManager`, `InventoryOperator`, `InventoryViewer`).
- **Audit Logging**: Every command execution must immutably record *Who, When, What, Why*.
- **Sensitive Data Isolation**: Verification that secrets never enter Events, Logs, Snapshots.
- **CERT-018 Security Boundary Certification**: Validates RBAC enforcement, Tenant Boundary Isolation, and Secret Leakage scanning.

### PILLAR 4 — Backup & Recovery
**Mission**: *Inventory survives catastrophe.*
- **Backups**: Daily Full Backup + Incremental Backup Strategy for the Event Store. Daily Snapshots.
- **CERT-013 Disaster Restore**: Delete everything → Restore Backup → Replay → Prove State Matches.

### PILLAR 5 — Performance Certification
Correctness is already certified. We must now prove capacity:
- **CERT-014 Reservation Load**: Withstand 100,000 Concurrent Reservations.
- **CERT-015 Replay Scale**: Replay 10 Million Events without memory exhaustion.
- **CERT-016 Projection Catch-Up**: Take Projection Offline → 1 Million Events Behind → Catch Up.
- **CERT-017 ACL Throughput**: Translate 100,000 External Events reliably.

### PILLAR 6 — Deployment Architecture
Monolithic deployment is prohibited. The deployment topology is frozen into independent workloads:
- **Topology**: `Inventory API`, `Inventory Worker`, `Projection Worker`, `Replay Worker`, `ACL Worker`, `Scheduler Worker`.
- **Health Checks**: Every worker must expose Liveness, Readiness, and Startup probes natively compliant with Kubernetes. Isolated health monitors must exist for API, Projection, Replay, ACL, DLQ, and Outbox.
