-- CreateEnum
CREATE TYPE "PrincipalKind" AS ENUM ('USER', 'AI_AGENT', 'SERVICE');

-- CreateEnum
CREATE TYPE "PrincipalState" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "WorkspaceKind" AS ENUM ('PRODUCTION', 'SANDBOX', 'DEMO');

-- CreateEnum
CREATE TYPE "NodeState" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Effect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "GrantState" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ScopeDim" AS ENUM ('ORGANIZATION', 'WORKSPACE', 'ENTITY', 'LOCATION', 'DEPARTMENT', 'TEAM', 'PROJECT', 'MODULE', 'CAPABILITY', 'RESOURCE', 'RECORD', 'FIELD');

-- CreateEnum
CREATE TYPE "ScopeMode" AS ENUM ('EXACT', 'SUBTREE', 'EXCLUDE');

-- CreateEnum
CREATE TYPE "IamAuditAction" AS ENUM ('GRANT_CREATED', 'GRANT_REVOKED', 'GRANT_SUSPENDED', 'ROLE_EDITED', 'POLICY_CHANGED', 'SCOPE_NARROWED', 'NODE_SUSPENDED', 'NODE_ARCHIVED', 'PRINCIPAL_SUSPENDED', 'PRINCIPAL_OFFBOARDED', 'BREAK_GLASS_ACTIVATED', 'IMPERSONATION_STARTED', 'IMPERSONATION_STOPPED', 'MODULE_REGISTERED');

-- NOTE: prisma migrate diff also reported a DROP COLUMN on "reporting_executive_dashboard"
-- (pre-existing drift between schema.prisma and the live DB — camelCase vs lowercase columns).
-- That statement is UNRELATED to OCTIEN IAM and has been intentionally REMOVED from this
-- additive Expand migration. The drift is flagged for separate handling; do not drop those
-- columns as part of the IAM rollout.

-- CreateTable
CREATE TABLE "iam_principals" (
    "id" TEXT NOT NULL,
    "kind" "PrincipalKind" NOT NULL DEFAULT 'USER',
    "organizationId" TEXT NOT NULL,
    "state" "PrincipalState" NOT NULL DEFAULT 'ACTIVE',
    "defaultWorkspaceId" TEXT,
    "subjectPrincipalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iam_principals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_organizations" (
    "id" TEXT NOT NULL,
    "legacyTenantId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iam_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_workspaces" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "WorkspaceKind" NOT NULL DEFAULT 'PRODUCTION',
    "state" "NodeState" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iam_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_entity_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "lifecycleState" TEXT NOT NULL DEFAULT 'Stable',

    CONSTRAINT "iam_entity_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_entities" (
    "id" TEXT NOT NULL,
    "legacyBusinessId" TEXT,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "entityTemplateId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iam_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_locations" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "state" "NodeState" NOT NULL DEFAULT 'ACTIVE',
    "isEntityRoot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iam_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_departments" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" "NodeState" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "iam_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_teams" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" "NodeState" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "iam_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_projects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" "NodeState" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "iam_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_project_links" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entityId" TEXT,
    "departmentId" TEXT,

    CONSTRAINT "iam_project_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_permission_groups" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "iam_permission_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_group_permissions" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "iam_group_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_role_groups" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "iam_role_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_grants" (
    "id" TEXT NOT NULL,
    "principalId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "effect" "Effect" NOT NULL DEFAULT 'ALLOW',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "state" "GrantState" NOT NULL DEFAULT 'ACTIVE',
    "legacyMembershipId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iam_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_scopes" (
    "id" TEXT NOT NULL,

    CONSTRAINT "iam_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_scope_dimensions" (
    "id" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "dimension" "ScopeDim" NOT NULL,
    "nodeId" TEXT,
    "valueKey" TEXT,
    "mode" "ScopeMode" NOT NULL DEFAULT 'EXACT',

    CONSTRAINT "iam_scope_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "effect" "Effect" NOT NULL,
    "targetResourceKey" TEXT,
    "targetActionKey" TEXT,
    "targetField" TEXT,
    "conditionExpr" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iam_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_modules" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "lifecycleState" TEXT NOT NULL DEFAULT 'Stable',

    CONSTRAINT "iam_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_resource_definitions" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "iam_resource_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_action_definitions" (
    "id" TEXT NOT NULL,
    "resourceDefId" TEXT NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "iam_action_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_audit_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorPrincipalId" TEXT,
    "action" "IamAuditAction" NOT NULL,
    "targetRef" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iam_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_migration_audit" (
    "id" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "rowsAffected" INTEGER,
    "checksumBefore" TEXT,
    "checksumAfter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "notes" TEXT,

    CONSTRAINT "iam_migration_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "iam_principals_organizationId_state_idx" ON "iam_principals"("organizationId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "iam_organizations_legacyTenantId_key" ON "iam_organizations"("legacyTenantId");

-- CreateIndex
CREATE UNIQUE INDEX "iam_organizations_slug_key" ON "iam_organizations"("slug");

-- CreateIndex
CREATE INDEX "iam_workspaces_organizationId_state_idx" ON "iam_workspaces"("organizationId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "iam_entity_templates_key_key" ON "iam_entity_templates"("key");

-- CreateIndex
CREATE UNIQUE INDEX "iam_entities_legacyBusinessId_key" ON "iam_entities"("legacyBusinessId");

-- CreateIndex
CREATE UNIQUE INDEX "iam_entities_slug_key" ON "iam_entities"("slug");

-- CreateIndex
CREATE INDEX "iam_entities_organizationId_idx" ON "iam_entities"("organizationId");

-- CreateIndex
CREATE INDEX "iam_entities_workspaceId_idx" ON "iam_entities"("workspaceId");

-- CreateIndex
CREATE INDEX "iam_locations_entityId_idx" ON "iam_locations"("entityId");

-- CreateIndex
CREATE INDEX "iam_locations_entityId_path_idx" ON "iam_locations"("entityId", "path");

-- CreateIndex
CREATE INDEX "iam_departments_entityId_idx" ON "iam_departments"("entityId");

-- CreateIndex
CREATE INDEX "iam_teams_departmentId_idx" ON "iam_teams"("departmentId");

-- CreateIndex
CREATE INDEX "iam_projects_organizationId_idx" ON "iam_projects"("organizationId");

-- CreateIndex
CREATE INDEX "iam_project_links_projectId_idx" ON "iam_project_links"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "iam_permission_groups_organizationId_key_key" ON "iam_permission_groups"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "iam_group_permissions_groupId_permissionId_key" ON "iam_group_permissions"("groupId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "iam_role_groups_roleId_groupId_key" ON "iam_role_groups"("roleId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "iam_grants_legacyMembershipId_key" ON "iam_grants"("legacyMembershipId");

-- CreateIndex
CREATE INDEX "iam_grants_principalId_state_idx" ON "iam_grants"("principalId", "state");

-- CreateIndex
CREATE INDEX "iam_grants_roleId_idx" ON "iam_grants"("roleId");

-- CreateIndex
CREATE INDEX "iam_scope_dimensions_scopeId_idx" ON "iam_scope_dimensions"("scopeId");

-- CreateIndex
CREATE INDEX "iam_scope_dimensions_dimension_nodeId_idx" ON "iam_scope_dimensions"("dimension", "nodeId");

-- CreateIndex
CREATE INDEX "iam_policies_organizationId_idx" ON "iam_policies"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "iam_modules_key_key" ON "iam_modules"("key");

-- CreateIndex
CREATE UNIQUE INDEX "iam_resource_definitions_moduleId_key_key" ON "iam_resource_definitions"("moduleId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "iam_action_definitions_resourceDefId_key_key" ON "iam_action_definitions"("resourceDefId", "key");

-- CreateIndex
CREATE INDEX "iam_audit_events_organizationId_at_idx" ON "iam_audit_events"("organizationId", "at");

-- CreateIndex
CREATE INDEX "iam_audit_events_actorPrincipalId_at_idx" ON "iam_audit_events"("actorPrincipalId", "at");

-- CreateIndex
CREATE INDEX "iam_migration_audit_step_idx" ON "iam_migration_audit"("step");

-- AddForeignKey
ALTER TABLE "iam_workspaces" ADD CONSTRAINT "iam_workspaces_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "iam_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_entities" ADD CONSTRAINT "iam_entities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "iam_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_entities" ADD CONSTRAINT "iam_entities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "iam_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_entities" ADD CONSTRAINT "iam_entities_entityTemplateId_fkey" FOREIGN KEY ("entityTemplateId") REFERENCES "iam_entity_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_locations" ADD CONSTRAINT "iam_locations_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "iam_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_locations" ADD CONSTRAINT "iam_locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "iam_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_departments" ADD CONSTRAINT "iam_departments_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "iam_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_teams" ADD CONSTRAINT "iam_teams_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "iam_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_projects" ADD CONSTRAINT "iam_projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "iam_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_project_links" ADD CONSTRAINT "iam_project_links_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "iam_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_group_permissions" ADD CONSTRAINT "iam_group_permissions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "iam_permission_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_role_groups" ADD CONSTRAINT "iam_role_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "iam_permission_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_grants" ADD CONSTRAINT "iam_grants_principalId_fkey" FOREIGN KEY ("principalId") REFERENCES "iam_principals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_grants" ADD CONSTRAINT "iam_grants_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "iam_scopes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_scope_dimensions" ADD CONSTRAINT "iam_scope_dimensions_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "iam_scopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_policies" ADD CONSTRAINT "iam_policies_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "iam_scopes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_resource_definitions" ADD CONSTRAINT "iam_resource_definitions_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "iam_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_action_definitions" ADD CONSTRAINT "iam_action_definitions_resourceDefId_fkey" FOREIGN KEY ("resourceDefId") REFERENCES "iam_resource_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_audit_events" ADD CONSTRAINT "iam_audit_events_actorPrincipalId_fkey" FOREIGN KEY ("actorPrincipalId") REFERENCES "iam_principals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

