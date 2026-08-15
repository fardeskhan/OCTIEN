# OCTIEN IAM Migration Infrastructure

Reversible, phased migration from the legacy RBAC model
(`Tenant → Business → Membership → Role → Permission`) to the OCTIEN IAM model
(`Organization → Entity → Grant (Role × Scope) → Policy`), per
`docs/platform/OCTIEN_IAM_IMPLEMENTATION_PLAN.md`.

The project manages Postgres (Neon) via `prisma db push` and has **no prior migration history**, so this
folder holds **hand-reviewable, versioned SQL** as the migration artifact instead of relying on a full
`db push` (which would also apply unrelated pre-existing drift — see the drift note below).

## Phases (only Phase 4 is destructive)

```
0 EXPAND    001_expand.sql — additive: create all iam_* tables + enums + indexes. (this increment)
1 BACKFILL  (next increment) idempotent legacy → iam_* copy; writes iam_migration_audit rows.
2 SHADOW    Permission Engine computes decisions in parallel; parity harness compares vs legacy.
3 CUTOVER   feature-flag flips engine to authority; legacy check kept as instant-revert fallback.
4 CONTRACT  (only after parity=0 + green security matrix + soak) drop legacy tables/columns.
```

## Files

- `001_expand.sql` — **Phase 0**, purely additive. 23 `CREATE TABLE iam_*`, 9 `CREATE TYPE`, indexes,
  unique constraints, and intra-`iam_*` foreign keys. Contains **no** `DROP`/`ALTER COLUMN`/`DELETE`/
  `TRUNCATE` on any table. Generated from `prisma migrate diff` (live DB → new datamodel), then the one
  unrelated drift statement was removed (see below).

## Applying Phase 0 (NOT yet applied — awaiting go-ahead)

`001_expand.sql` has **not** been run against the live Neon database. It is additive and safe, but the
apply step is gated on explicit approval because the target is the live pilot DB. Two ways to apply, once
approved:

```bash
# Option A — run the reviewed SQL directly (recommended: applies ONLY the additive IAM changes)
psql "$DATABASE_URL" -f packages/database/iam-migration/001_expand.sql

# Option B — prisma db push (⚠ would ALSO apply the unrelated drift fix; see note — prefer Option A)
# npx prisma db push --schema packages/database/prisma/schema.prisma
```

Prefer **Option A**: it applies exactly the audited additive statements and nothing else.

## Rollback (Phase 0)

Fully reversible — the new tables are empty and unread:

```sql
DROP TABLE IF EXISTS
  iam_action_definitions, iam_resource_definitions, iam_modules,
  iam_policies, iam_scope_dimensions, iam_scopes, iam_grants,
  iam_role_groups, iam_group_permissions, iam_permission_groups,
  iam_project_links, iam_projects, iam_teams, iam_departments,
  iam_locations, iam_entities, iam_entity_templates, iam_workspaces,
  iam_organizations, iam_principals, iam_audit_events, iam_migration_audit
CASCADE;
DROP TYPE IF EXISTS
  "IamAuditAction","ScopeMode","ScopeDim","GrantState","Effect",
  "NodeState","WorkspaceKind","PrincipalState","PrincipalKind";
```

Legacy tables (`tenants`, `businesses`, `memberships`, `roles`, `permissions`, …) are **untouched** by
Phase 0.

## ⚠ Pre-existing drift note (not part of IAM)

`prisma migrate diff` also reported a destructive change **unrelated to IAM**:

```
ALTER TABLE "reporting_executive_dashboard"
  DROP COLUMN "activesuppliers", "lowstockalerts", "monthlyspend",
              "openpoamount", "pendingreceipts", "totalinventoryval";
```

This is **pre-existing schema drift**: the live DB has lowercase columns while the current
`ExecutiveDashboardProjection` model expects camelCase (`activeSuppliers`, …). It was **removed** from
`001_expand.sql` and must be handled separately — do **not** fold it into the IAM rollout, and do **not**
run a blanket `prisma db push` that would silently drop those columns.
