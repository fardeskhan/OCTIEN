-- =============================================================================
-- OCTIEN IAM — Increment 2B: Authorization Backfill (INSERTS ONLY)
-- -----------------------------------------------------------------------------
-- Writes ONLY to iam_* tables. NO DELETE/UPDATE/DROP/TRUNCATE; NO legacy table modified.
-- Idempotent: deterministic PKs + ON CONFLICT ("id") DO NOTHING.
-- INERT DATA ONLY — does not change enforcement. The app still authorizes via the
-- legacy Membership/Role path. This increment only *represents* today's authorization
-- state in the OCTIEN model so 2C can prove parity.
--
-- Scope:
--   Permission catalog  → Module → ResourceDefinition → ActionDefinition (registry)
--   Membership          → Grant (Role × single ENTITY scope = the membership's reach)
-- Legacy `roles` are reused as-is (Grant.roleId → roles.id); no separate role table.
-- Role-permission content stays in legacy role_permissions during transition.
--
-- Order respects FKs:
--   modules → resource_definitions → action_definitions ; scopes → scope_dimensions ; grants
-- =============================================================================

-- 1) Single synthetic transition Module that owns the legacy catalog. Real per-module
--    ownership (via module manifests) is a later step; this faithfully records that these
--    resources/actions exist and are authorizable, without inventing module ownership.
INSERT INTO "iam_modules" ("id", "key", "name", "version", "lifecycleState")
VALUES ('mod__legacy', 'legacy', 'Legacy Catalog', '1.0.0', 'Stable')
ON CONFLICT ("id") DO NOTHING;

-- 2) Permission.resource → ResourceDefinition (one per distinct resource)
INSERT INTO "iam_resource_definitions" ("id", "moduleId", "key", "name")
SELECT DISTINCT 'rd__' || p."resource", 'mod__legacy', p."resource", p."resource"
FROM "permissions" p
ON CONFLICT ("id") DO NOTHING;

-- 3) Permission.(resource,action) → ActionDefinition (one per distinct pair)
INSERT INTO "iam_action_definitions" ("id", "resourceDefId", "key")
SELECT DISTINCT 'ad__' || p."resource" || '__' || p."action", 'rd__' || p."resource", p."action"
FROM "permissions" p
ON CONFLICT ("id") DO NOTHING;

-- 4) Membership → Scope (one Scope per membership)
INSERT INTO "iam_scopes" ("id")
SELECT 'scope__' || m."id"
FROM "memberships" m
ON CONFLICT ("id") DO NOTHING;

-- 5) Membership → ScopeDimension (a single ENTITY = membership.businessId, EXACT).
--    Exactly one dimension → the grant cannot reach beyond that Entity (no broadening).
INSERT INTO "iam_scope_dimensions" ("id", "scopeId", "dimension", "nodeId", "valueKey", "mode")
SELECT 'sd__' || m."id", 'scope__' || m."id", 'ENTITY'::"ScopeDim", m."businessId", NULL, 'EXACT'::"ScopeMode"
FROM "memberships" m
ON CONFLICT ("id") DO NOTHING;

-- 6) Membership → Grant (Principal ← Role @ Entity-scope). Behavior-preserving 1:1:
--    principal = membership.userId, role = membership.roleId, ALLOW/ACTIVE, linked by
--    legacyMembershipId. This equals exactly what the user could do before.
INSERT INTO "iam_grants" ("id", "principalId", "roleId", "scopeId", "effect", "state", "legacyMembershipId", "createdBy", "createdAt", "updatedAt")
SELECT 'grant__' || m."id", m."userId", m."roleId", 'scope__' || m."id",
       'ALLOW'::"Effect", 'ACTIVE'::"GrantState", m."id", 'iam-backfill-2b', now(), now()
FROM "memberships" m
ON CONFLICT ("id") DO NOTHING;
