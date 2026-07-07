# Operational Runbooks - CAP-INVENTORY

## Runbook 001: Projection Rebuild
**Scenario**: A projection requires schema update or becomes irreparably corrupted.
**Steps**:
1. Take Projection Worker offline.
2. Issue truncate/drop on the target Projection read-model tables.
3. Trigger `ReplayEngine.replay(targetProjection)`.
4. Monitor Projection Lag Metric until `< 5 seconds`.
5. Bring Projection Worker online.
6. Validate Hashes.

## Runbook 002: DLQ Recovery
**Scenario**: Events failed projection and routed to the Dead Letter Queue.
**Steps**:
1. Identify the failing projection code/schema.
2. Deploy fix/repair.
3. Trigger DLQ replay pipeline.
4. Verify DLQ size returns to 0.

## Runbook 003: Outbox Recovery
**Scenario**: Network partition prevents Outbox polling, backlog grows.
**Steps**:
1. Verify database connection pooling to outbox tables.
2. Restart Outbox Poller process on `Inventory Worker`.
3. Monitor Outbox Backlog Metric until it resolves.

## Runbook 004: Snapshot Corruption Recovery
**Scenario**: An aggregate snapshot is written with invalid state.
**Steps**:
1. Delete the specific snapshot record by `aggregateId`.
2. Reload aggregate (forces full stream read from Event 0).
3. System will naturally take a new snapshot on the next Nth interval.

## Runbook 005: Tenant Recovery
**Scenario**: Tenant-specific data requires point-in-time recovery without impacting other tenants.
**Steps**:
1. Isolate the affected `tenantId`.
2. Delete projection data scoped explicitly by `tenantId`.
3. Replay Event Store filtered by `tenantId`.

## Runbook 006: Disaster Recovery
**Scenario**: Complete infrastructure loss in the primary environment.
**Steps**:
1. Provision new environment via IaC.
2. Restore Daily Full Backup + Incrementals to Event Store.
3. Restore Snapshots.
4. Run full `ReplayEngine` catch-up.
5. Validate state determinism against last known good hash.

## Runbook 007: Regional Failover
**Scenario**: Primary Region Lost.
**Steps**:
1. Failover traffic to secondary region via DNS/Load Balancers.
2. Ensure read-replica of Event Store promotes to primary.
3. Restore Snapshots if cross-region replication failed.
4. Resume processing.

## Runbook 008: Capacity Expansion
**Scenario**: Projection Lag Increasing, Reservation Throughput Growing.
**Steps**:
1. Scale up number of `Inventory Worker` pods (Horizontal Pod Autoscaling).
2. Provision higher IOPS for Event Store storage.
3. Rebalance queue partitions for ACL workers.
4. Validate SLA recovery (e.g. 95th Percentile < 500ms).
