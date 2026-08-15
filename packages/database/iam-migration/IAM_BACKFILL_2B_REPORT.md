# OCTIEN IAM — Increment 2B Backfill Report (Authorization)

> Independent READ-ONLY verification. INERT DATA ONLY — enforcement unchanged. Generated: 2026-08-12T10:23:43.478Z

## Registry (Module → ResourceDefinition → ActionDefinition)

| Item | Count | Expected | OK |
|---|---|---|---|
| `iam_modules` (transition) | 1 | ≥1 | ✔ |
| `iam_resource_definitions` | 17 | distinct resources = 17 | ✔ |
| `iam_action_definitions` | 29 | distinct (resource,action) = 29 (= permissions 29) | ✔ |

## Membership → Grant (behavior-preserving 1:1)

| Item | Count |
|---|---|
| `memberships` | 4 |
| `iam_grants` | 4 |
| `iam_scopes` | 4 |
| `iam_scope_dimensions` | 4 |

## Actual inserted counts (from iam_migration_audit)

| Step | rowsAffected | finishedAt |
|---|---|---|
| 2B:action_definitions | 29 | 2026-08-12T04:50:25.346Z |
| 2B:grants | 4 | 2026-08-12T04:50:25.346Z |
| 2B:modules | 1 | 2026-08-12T04:50:25.346Z |
| 2B:resource_definitions | 17 | 2026-08-12T04:50:25.346Z |
| 2B:scope_dimensions | 4 | 2026-08-12T04:50:25.346Z |
| 2B:scopes | 4 | 2026-08-12T04:50:25.346Z |
| 2B:action_definitions | 0 | 2026-08-12T04:50:39.215Z |
| 2B:grants | 0 | 2026-08-12T04:50:39.215Z |
| 2B:modules | 0 | 2026-08-12T04:50:39.215Z |
| 2B:resource_definitions | 0 | 2026-08-12T04:50:39.215Z |
| 2B:scope_dimensions | 0 | 2026-08-12T04:50:39.215Z |
| 2B:scopes | 0 | 2026-08-12T04:50:39.215Z |

## No-broadening & integrity checks

- [x] every membership → exactly one grant (counts equal)
- [x] no invented grants; no membership left unmapped
- [x] each grant's principal=userId and role=roleId (matches its membership)
- [x] all grants are ALLOW + ACTIVE (legacy has no deny)
- [x] every scope has EXACTLY ONE dimension (no accidental broadening)
- [x] every dimension is {ENTITY, EXACT, nodeId} — no wider scope type
- [x] each grant's ENTITY scope == membership.businessId (same reach)
- [x] every grant.roleId resolves to a legacy role
- [x] every ENTITY scope nodeId resolves to an iam_entities row

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

*volatile = sessions/audit change with normal login/app activity, never from the backfill (which writes only iam_* tables).

## reporting_executive_dashboard (must be untouched)

- Columns: **16** (expected 16) ✔ · orphans present: **6/6** ✔

## Enforcement unchanged (inert data)

- No change to `auth.ts`, Better Auth, middleware, or any authorization code path.
- The application still authorizes via the legacy Membership/Role model; these Grants/registry rows are not consulted yet.
- Whether the new model *computes the same access* is proven separately in **2C (parity harness)** — not here.

## Idempotency

- Deterministic PKs + `ON CONFLICT ("id") DO NOTHING`; re-running inserts 0 rows (probe + second `--confirm` run).

## Rollback procedure (2B data only)

```sql
DELETE FROM "iam_grants"             WHERE "legacyMembershipId" IS NOT NULL;
DELETE FROM "iam_scope_dimensions"   WHERE "id" LIKE 'sd__%';
DELETE FROM "iam_scopes"             WHERE "id" LIKE 'scope__%';
DELETE FROM "iam_action_definitions" WHERE "id" LIKE 'ad__%';
DELETE FROM "iam_resource_definitions" WHERE "moduleId" = 'mod__legacy';
DELETE FROM "iam_modules"            WHERE "id" = 'mod__legacy';
DELETE FROM "iam_migration_audit"    WHERE step LIKE '2B:%';
```

## Result

**PASS ✔** — today's authorization state is faithfully represented in OCTIEN, with no broadening; legacy behavior and data unchanged.