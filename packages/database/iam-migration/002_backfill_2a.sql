-- =============================================================================
-- OCTIEN IAM — Increment 2A: Identity & Organization Backfill (INSERTS ONLY)
-- -----------------------------------------------------------------------------
-- Writes ONLY to iam_* tables. Contains NO DELETE / UPDATE / DROP / TRUNCATE and
-- modifies NO legacy table. Idempotent: deterministic primary keys derived from
-- legacy ids + ON CONFLICT ("id") DO NOTHING, so re-running inserts 0 extra rows.
-- Order respects FKs: organizations -> workspaces -> principals -> entities -> locations.
-- Scope: Tenant->Organization, (Organization->Production Workspace, required by
-- Entity FK), User->Principal, Business->Entity, Entity->synthetic root Location.
-- Membership->Grant and Role/Permission catalogs are OUT OF SCOPE (Increment 2B).
-- =============================================================================

-- 1) Tenant -> Organization   (Organization.id = tenant.id ; legacyTenantId = tenant.id)
INSERT INTO "iam_organizations" ("id", "legacyTenantId", "name", "slug", "createdAt", "updatedAt")
SELECT t."id", t."id", t."name", t."slug", COALESCE(t."createdAt", now()), now()
FROM "tenants" t
ON CONFLICT ("id") DO NOTHING;

-- 2) Organization -> Production Workspace   (id = organization.id || '__production')
--    Required because iam_entities.workspaceId is a NOT NULL FK to iam_workspaces.
INSERT INTO "iam_workspaces" ("id", "organizationId", "name", "kind", "state", "createdAt")
SELECT o."id" || '__production', o."id", 'Production',
       'PRODUCTION'::"WorkspaceKind", 'ACTIVE'::"NodeState", now()
FROM "iam_organizations" o
ON CONFLICT ("id") DO NOTHING;

-- 3) User -> Principal   (Principal.id = user.id ; organizationId = user.tenantId ; kind USER)
INSERT INTO "iam_principals" ("id", "kind", "organizationId", "state", "defaultWorkspaceId", "createdAt", "updatedAt")
SELECT u."id", 'USER'::"PrincipalKind", u."tenantId", 'ACTIVE'::"PrincipalState",
       u."tenantId" || '__production', COALESCE(u."createdAt", now()), now()
FROM "users" u
ON CONFLICT ("id") DO NOTHING;

-- 4) Business -> Entity   (Entity.id = business.id ; legacyBusinessId = business.id ;
--    workspaceId = the org's Production Workspace ; entityTemplateId left NULL for now)
INSERT INTO "iam_entities" ("id", "legacyBusinessId", "organizationId", "workspaceId", "entityTemplateId", "name", "slug", "status", "createdAt", "updatedAt")
SELECT b."id", b."id", b."tenantId", b."tenantId" || '__production', NULL,
       b."name", b."slug", COALESCE(b."status", 'ACTIVE'), COALESCE(b."createdAt", now()), now()
FROM "businesses" b
ON CONFLICT ("id") DO NOTHING;

-- 5) Entity -> synthetic Entity-root Location   (id = entity.id || '__root' ; isEntityRoot = true)
--    Deterministic root node so legacy records can later be stamped to a real location (not NULL).
INSERT INTO "iam_locations" ("id", "entityId", "parentId", "type", "name", "path", "state", "isEntityRoot", "createdAt")
SELECT e."id" || '__root', e."id", NULL, 'ENTITY_ROOT', e."name", e."slug" || '/',
       'ACTIVE'::"NodeState", true, now()
FROM "iam_entities" e
ON CONFLICT ("id") DO NOTHING;
