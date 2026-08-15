# OCTIEN IAM — Post-Apply Verification Baseline (READ ONLY)

> Captured after applying `001_expand.sql`. Read-only; DB unmodified by this check.
> Generated: 2026-08-10T12:48:27.183Z

## iam_* tables (expected 22)

Present: **22/22** ✔

## IAM enums (expected 9)

Present: **9/9** ✔

## IAM indexes
```
iam_action_definitions.iam_action_definitions_pkey
iam_action_definitions.iam_action_definitions_resourceDefId_key_key
iam_audit_events.iam_audit_events_actorPrincipalId_at_idx
iam_audit_events.iam_audit_events_organizationId_at_idx
iam_audit_events.iam_audit_events_pkey
iam_departments.iam_departments_entityId_idx
iam_departments.iam_departments_pkey
iam_entities.iam_entities_legacyBusinessId_key
iam_entities.iam_entities_organizationId_idx
iam_entities.iam_entities_pkey
iam_entities.iam_entities_slug_key
iam_entities.iam_entities_workspaceId_idx
iam_entity_templates.iam_entity_templates_key_key
iam_entity_templates.iam_entity_templates_pkey
iam_grants.iam_grants_legacyMembershipId_key
iam_grants.iam_grants_pkey
iam_grants.iam_grants_principalId_state_idx
iam_grants.iam_grants_roleId_idx
iam_group_permissions.iam_group_permissions_groupId_permissionId_key
iam_group_permissions.iam_group_permissions_pkey
iam_locations.iam_locations_entityId_idx
iam_locations.iam_locations_entityId_path_idx
iam_locations.iam_locations_pkey
iam_migration_audit.iam_migration_audit_pkey
iam_migration_audit.iam_migration_audit_step_idx
iam_modules.iam_modules_key_key
iam_modules.iam_modules_pkey
iam_organizations.iam_organizations_legacyTenantId_key
iam_organizations.iam_organizations_pkey
iam_organizations.iam_organizations_slug_key
iam_permission_groups.iam_permission_groups_organizationId_key_key
iam_permission_groups.iam_permission_groups_pkey
iam_policies.iam_policies_organizationId_idx
iam_policies.iam_policies_pkey
iam_principals.iam_principals_organizationId_state_idx
iam_principals.iam_principals_pkey
iam_project_links.iam_project_links_pkey
iam_project_links.iam_project_links_projectId_idx
iam_projects.iam_projects_organizationId_idx
iam_projects.iam_projects_pkey
iam_resource_definitions.iam_resource_definitions_moduleId_key_key
iam_resource_definitions.iam_resource_definitions_pkey
iam_role_groups.iam_role_groups_pkey
iam_role_groups.iam_role_groups_roleId_groupId_key
iam_scope_dimensions.iam_scope_dimensions_dimension_nodeId_idx
iam_scope_dimensions.iam_scope_dimensions_pkey
iam_scope_dimensions.iam_scope_dimensions_scopeId_idx
iam_scopes.iam_scopes_pkey
iam_teams.iam_teams_departmentId_idx
iam_teams.iam_teams_pkey
iam_workspaces.iam_workspaces_organizationId_state_idx
iam_workspaces.iam_workspaces_pkey
```

## IAM foreign keys (must reference iam_* only)

Total FKs on iam_* tables: 19; referencing non-iam: **0** ✔

## Legacy row counts vs baseline

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
| `sessions` | 40 | 40 | volatile* | = |
| `audit_logs` | 22 | 22 | volatile* | = |
| `audit_events` | 79 | 79 | volatile* | = |

*volatile = sessions/audit change with normal app usage, never from DDL; a difference here is not a schema problem.

## Result

**PASS ✔** — all iam_* structures present, FKs IAM-local, legacy config tables unchanged.
## Legacy-untouched confirmation (independent read-only)

- Total `public` base tables: **129** = baseline **107 + 22** IAM (no other table added or removed).
- `iam_*` tables: **22**.
- `reporting_executive_dashboard`: **16 columns, unchanged**; all **6 orphan lowercase columns still
  present** (`activesuppliers, lowstockalerts, monthlyspend, openpoamount, pendingreceipts,
  totalinventoryval`) — the drift was **not** touched, exactly as required.

## Invariant

**PRE-APPLY legacy state == POST-APPLY legacy state.** The only intended database change — the addition
of the 22 `iam_*` tables, 9 enums, indexes, and IAM-local foreign keys — is the only change that occurred.
No legacy table was altered; no legacy data was modified.

**STOP.** Do not proceed to Increment 2 (backfill) without a new explicit approval.
