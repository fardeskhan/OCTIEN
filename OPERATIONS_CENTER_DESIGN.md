# OCTIEN Operations Center — Design (implementation deferred)

**Status:** design only. Build **after** the Sales module is production-complete. This consolidates
the operational infrastructure already proven in OCTIEN (event bus, outbox, audit, financial
posting, runtime verification) into one administrative console — the kind of operational
visibility SAP / Oracle / Dynamics ship.

## Why
When something goes wrong in production an administrator must immediately answer: which events are
pending or failed? which journals didn't post? which reservations are waiting? which workflows are
stalled? Today that data exists across `outbox_events`, `audit_logs`, `journal_entries`,
`reservations`, `compliance_jobs` — but there is no single place to see it.

## Navigation & route
`/(dashboard)/operations/center` (admin-gated). Left sub-nav within the console:

```
Operations Center
├── Overview            (health tiles + recent failures)
├── Workflow Monitor    (per-aggregate lifecycle timelines)
├── Event Bus / Outbox  (pending / processing / completed / failed queues)
├── Failed Events (DLQ) (inspect payload · retry · replay)
├── Journal Posting     (unposted / recent postings · GL balance check)
├── Reservations        (active / waiting / expired)
├── Runtime Verification (run sales-runtime etc. · last results)
├── Audit Explorer      (filterable audit_log stream)
├── Background Jobs      (compliance_jobs / scheduled)
└── System Diagnostics   (DB latency · Neon pool · env checks)
```

## Page layout
`EnterprisePageHeader` + a health KPI row (`EnterpriseKPIRow` of `EnterpriseStatCard`) + a tabbed
body. Each tab is an `EnterpriseDataTable` (search/filter/paginate/export already built) plus a
detail drawer/dialog. Reuse `EnterpriseStatusBadge` for every state column.

## Widgets & data sources
| Widget | Source | Key columns / metrics |
|---|---|---|
| Health tiles | aggregates below | Pending events, Failed events, Unposted journals, Active reservations, GL balanced? |
| Workflow Monitor | `outbox_events` + `audit_logs` by `aggregateId` | event → status → timestamp timeline (SO/Shipment/Invoice) |
| Outbox Queue | `outbox_events` grouped by `status` | eventType, aggregateId, occurredAt, retryCount |
| Failed Events (DLQ) | `outbox_events WHERE status='FAILED'` | failureReason, payload (inspect), **Retry** (reset→PENDING + drain), **Replay** |
| Journal Posting | `journal_entries` + `journal_lines` | source, DR/CR, balanced?; Σdebits==Σcredits invariant |
| Reservations | `reservations` | referenceId (SO), qty, status, expiresAt |
| Runtime Verification | `/api/dev/verify-*` (promote to admin API) | last run pass/fail per module |
| Audit Explorer | `audit_logs` | actor, action, resource, resourceId, when + metadata |
| Background Jobs | `compliance_jobs` (+ future runner) | type, status, scheduledFor, lastRun |
| Diagnostics | live probes | Neon RTT, pool state, `DATABASE_URL`/`BETTER_AUTH_URL` sanity |

## Actions (write, permission-gated + audited)
- **Retry / Replay** a failed event: reset `status→PENDING`, `drainOutbox()`, log audit.
- **Force-post** an unposted source (guarded, adjustment-journal semantics).
- **Run verification** on demand (the existing `sales-runtime` harness, generalized later).

All destructive/replay actions go through `EnterpriseConfirmDialog` and write `audit_logs`.

## Permissions
New `governance.operations` (read) + `governance.operations.manage` (retry/replay/force-post).
Owner (super-admin) bypasses. Console is **not** exposed to Sales/Finance operator roles.

## Build sequence (later)
1. Read-only Overview + Outbox Queue + Audit Explorer (pure reads — low risk).
2. Failed Events DLQ with Retry/Replay.
3. Workflow Monitor timelines.
4. Journal Posting + Reservations + Diagnostics.
5. Wire the generalized runtime-verification framework (built once ≥3 modules exist).

## Dependencies
- Reuses the enterprise kit (no new table/dialog primitives).
- The dev verification routes (`/api/dev/verify-*`, `recent-audit`, `recent-journals`) become the
  seed of the admin verification/inspection APIs (promoted from dev-only to admin-gated).
- A real background-job runner is still missing (models exist) — the Jobs tab is read-only until
  one is added.
