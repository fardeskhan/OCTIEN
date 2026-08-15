# OCTIEN IAM — Increment 2A Backfill Report (Identity & Organization)

> Independent READ-ONLY verification. DB unmodified by this check. Generated: 2026-08-12T10:23:26.500Z

## Mapping result

| Legacy source | Count | → OCTIEN target | Count | OK |
|---|---|---|---|---|
| `tenants` | 2 | `iam_organizations` | 2 | ✔ |
| (per organization) | 2 | `iam_workspaces` (Production) | 2 | ✔ |
| `users` | 2 | `iam_principals` | 2 | ✔ |
| `businesses` | 3 | `iam_entities` | 3 | ✔ |
| `businesses` | 3 | `iam_locations` (Entity-root) | 3 | ✔ |

## Actual inserted counts (from iam_migration_audit)

| Step | rowsAffected | finishedAt |
|---|---|---|
| 2A:entities | 3 | 2026-08-10T07:30:56.065Z |
| 2A:locations | 3 | 2026-08-10T07:30:56.065Z |
| 2A:organizations | 2 | 2026-08-10T07:30:56.065Z |
| 2A:principals | 2 | 2026-08-10T07:30:56.065Z |
| 2A:workspaces | 2 | 2026-08-10T07:30:56.065Z |
| 2A:entities | 0 | 2026-08-10T07:31:07.622Z |
| 2A:locations | 0 | 2026-08-10T07:31:07.622Z |
| 2A:organizations | 0 | 2026-08-10T07:31:07.622Z |
| 2A:principals | 0 | 2026-08-10T07:31:07.622Z |
| 2A:workspaces | 0 | 2026-08-10T07:31:07.622Z |

## Linkage & integrity checks

- [x] every tenant has exactly one organization (id + legacyTenantId)
- [x] every user has exactly one principal (id == user.id)
- [x] every business has exactly one entity (id + legacyBusinessId)
- [x] every entity has exactly one synthetic root location
- [x] legacy linkage complete (no NULL legacy ids)
- [x] no duplicate mappings (distinct linkage == rows)
- [x] referential sanity (principal.org, entity.workspace resolve)

## Legacy row counts

| Table | Baseline | Now | Kind | OK |
|---|---|---|---|---|
| `users` | 2 | 2 | config | ✔ |
| `roles` | 2 | 2 | config | ✔ |
| `permissions` | 29 | 29 | config | ✔ |
| `role_permissions` | 29 | 29 | config | ✔ |
| `memberships` | 4 | 4 | config | ✔ |
| `tenants` | 2 | 2 | config | ✔ |
| `businesses` | 3 | 3 | config | ✔ |
| `business_types` | 1 | 1 | config | ✔ |
| `accounts` | 2 | 2 | config | ✔ |
| `verifications` | 0 | 0 | config | ✔ |
| `sessions` | 40 | 42 | volatile* | ≠ (app usage) |
| `audit_logs` | 22 | 22 | volatile* | = |
| `audit_events` | 79 | 79 | volatile* | = |

*volatile = sessions/audit change with normal login/app activity, never from the backfill.

## reporting_executive_dashboard (must be untouched)

- Columns: **16** (expected 16) ✔
- Orphan columns still present: **6/6** ✔ (untouched)

## Idempotency

- Backfill uses deterministic PKs (legacy ids) + `ON CONFLICT ("id") DO NOTHING`.
- Mapped counts equal legacy source counts with unique linkage → re-running inserts 0 rows.
- Confirmed by the runner's internal probe (re-run in a rolled-back txn = 0 rows) and by a second `--confirm` execution.

## Transaction result

- Apply committed atomically inside `BEGIN; SET TRANSACTION READ WRITE; ...; COMMIT;`.
- On any failure the runner performs `ROLLBACK` with no automatic retry/repair.

## Rollback procedure (2A data only; structures remain)

```sql
-- Removes ONLY the 2A-backfilled rows; iam_* tables (Expand) stay in place.
DELETE FROM "iam_locations"     WHERE "isEntityRoot" = true;
DELETE FROM "iam_entities"      WHERE "legacyBusinessId" IS NOT NULL;
DELETE FROM "iam_principals";
DELETE FROM "iam_workspaces"    WHERE "id" LIKE '%__production';
DELETE FROM "iam_organizations" WHERE "legacyTenantId" IS NOT NULL;
DELETE FROM "iam_migration_audit" WHERE step LIKE '2A:%';
```

## Result

**PASS ✔** — identity & organization backfill complete, linkage sound, legacy data unchanged.