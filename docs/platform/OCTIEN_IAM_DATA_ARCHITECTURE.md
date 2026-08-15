# OCTIEN IAM Data Architecture — Persistence & Migration Blueprint

**Status:** DESIGN / ARCHITECTURE ONLY — no Prisma files, no migrations, no Better Auth changes, no code.
All schema shown here is **illustrative** (markdown sketches) to reason about shape and mapping — **none of
it is to be applied**. This document is the review gate *before* any migration is written.
**Companions:** `OCTIEN_IDENTITY_ARCHITECTURE.md`, `OCTIEN_ORGANIZATION_MODEL.md`,
`OCTIEN_ACCESS_CONTROL_MODEL.md`, `OCTIEN_PERMISSION_ENGINE.md`, `OCTIEN_EFFECTIVE_ACCESS_MODEL.md`,
`OCTIEN_PLATFORM_CORE.md`, `OCTIEN_DOMAIN_MODEL.md`.
**Depends on:** CAP-SHELL V1.0 (frozen) — the migration must not reopen or break the shell.

> The five model documents define *what IAM must be*. This document defines *how the current database
> becomes that* — the persistence model, the concept-by-concept mapping from today's
> `Tenant → Business → Membership → Role → Permission` to `Organization → Entity → Grant (Role × Scope) →
> Policy`, and a **reversible, shell-safe migration path**. It answers nine specific questions and a
> rollback/integrity strategy.

---

## 1. Purpose

Bridge approved architecture to safe implementation by specifying:

- The **target persistence model** for Identity, Organization, Access Control (tables, keys, relationships).
- The **mapping** from every existing model to its target.
- A **zero-downtime, expand→migrate→contract** migration that keeps the frozen shell and live COSMY data
  working throughout.
- The **Better Auth ↔ OCTIEN IAM boundary** (authentication vs authorization).
- **Rollback and data-integrity** guarantees at every phase.

This is the last architecture step before implementation; it deliberately surfaces hidden constraints now.

---

## 2. Current-state audit (identity & access tables only)

From `packages/database/prisma/schema.prisma` + `apps/frontend/src/lib/auth.ts`:

```
Tenant(id, name, slug)                                   ← Organization (isolation) ✔
Business(id, tenantId, businessTypeId, name, slug, …)    ← Entity (misnamed "Business")
BusinessType(id, name)                                   ← ~ Entity Template (thin)
User(id, tenantId, name, email, emailVerified, image)    ← Principal (human) + org link
Session / Account / Verification                          ← Better Auth (authentication) ✔
Role(id, tenantId, name, isSystem)                        ← Role (permission bag, no scope)
Permission(id, resource, action)  @@unique[resource,action] ← global permission catalog
RolePermission(roleId, permissionId)                      ← Role↔Permission ✔
Membership(userId, businessId, roleId) @@unique[userId,businessId]  ← ONE role per user per Business
AuditLog(tenantId, businessId?, actorId, action, resource, …)      ← coarse audit
AuditEvent(businessId, tenantId, entityType, entityId, …snapshots) ← data audit

auth.ts: databaseHooks.user.create.before → tenantId = "tnt_demo_001"  (HARDCODED)
Every ERP record carries: businessId + tenantId  (and createdBy/updatedBy on many)
```

**Reality:** authentication is sound (Better Auth). Authorization is **coarse RBAC** — user → one role per
Business → a flat resource.action bag; **no scope, no policy, no location/dept/team/project, no field
control, single hardcoded tenant.** Records are partitioned only by `businessId`/`tenantId`.

---

## 3. Problems this migration must solve

1. `Membership`'s `@@unique([userId, businessId])` **forbids multiple roles per user** — must be removed.
2. There is **nowhere to store scope** (location subtree, department, team, project, resource, field).
3. `tnt_demo_001` is **hardcoded** — real Organizations can't onboard.
4. Records carry **no hierarchy stamp** beyond `businessId`/`tenantId` — the engine has nothing to match.
5. `Business`/`BusinessType` naming **fights the industry-agnostic model** (Entity / Entity Template).
6. Permissions are **not tied to a module registry** — a new module can't contribute resources cleanly.
7. Migration must not **break the frozen shell** or corrupt live COSMY data, and must be **reversible**.

---

## 4. Requirements

- **R1** Preserve authentication in Better Auth untouched; add authorization in OCTIEN IAM alongside.
- **R2** `Principal.id == Better Auth User.id` (1:1) — no duplicate identity store.
- **R3** Multiple **Grants** per Principal (Role × Scope), replacing single-Membership.
- **R4** Persist **Scope** across all dimensions, with **subtree** (path-prefix) location matching.
- **R5** Every Record gains a **hierarchy stamp** (org, workspace, entity, location, department, team,
  project), backfilled deterministically from existing `tenantId`/`businessId`.
- **R6** **Module-registered** Resource/Action/Permission catalog — no industry hardcoding.
- **R7** Eliminate `tnt_demo_001`; Organization resolved via invite/onboarding context.
- **R8** **Expand→migrate→contract** so every phase is additive and reversible until the final drop.
- **R9** The shell keeps working at every phase (compatibility columns/views during transition).
- **R10** Idempotent, verifiable **backfill**; feature-flagged engine read path with legacy fallback.
- **R11** Full **audit** of the migration itself and of post-cutover IAM changes.

---

## 5. Terminology (deltas for this document)

| Term | Meaning here |
|---|---|
| **Expand→migrate→contract** | Additive schema first (expand), backfill + dual-read (migrate), drop legacy last (contract). Each step reversible until contract. |
| **Compatibility layer** | Views / retained columns that let the frozen shell and un-migrated code keep reading `businessId`/`tenantId` while new columns fill in. |
| **Hierarchy stamp** | The node references written onto each Record (`organizationId, workspaceId, entityId, locationId?, departmentId?, teamId?, projectId?`). |
| **Backfill** | One-time, idempotent population of new columns/tables from existing data. |
| **Cutover** | The flag flip where the Permission Engine becomes the authority (legacy check retired behind a fallback). |

---

## 6. Target persistence model (illustrative — not to be applied)

### 6.1 Identity (mostly Better Auth, thin OCTIEN overlay)

```
# Better Auth OWNS these (unchanged):
User(id, name, email, emailVerified, image, …)     # authentication identity
Session(id, userId, token, expiresAt, ip, ua, …)   # + add: organizationId, workspaceId, scopeSetRef (overlay)
Account(id, userId, providerId, password, …)       # credentials (pwd now; OIDC/SAML later)
Verification(…)

# OCTIEN IAM OWNS these (new; Principal.id == User.id):
Principal(id = User.id, kind[USER|AI_AGENT|SERVICE], organizationId, state[INVITED|ACTIVE|SUSPENDED|LOCKED|OFFBOARDED],
          defaultWorkspaceId?, subjectPrincipalId?  # for AI agents acting on behalf of a user
)
```

> The Session gains `organizationId/workspaceId/scopeSetRef` as an **overlay** (Better Auth supports
> additional session fields the same way `user.additionalFields.tenantId` works today) — no fork.

### 6.2 Organization structure (new)

```
Organization(id, name, slug)                                   # was Tenant
Workspace(id, organizationId, name, kind[PRODUCTION|SANDBOX|DEMO], state)
Entity(id, workspaceId, organizationId, entityTemplateId?, name, slug, status, …branding/finance fields…)  # was Business
EntityTemplate(id, key, name, version, lifecycleState)         # was BusinessType (evolved)
Location(id, entityId, parentId?, type, name, path, state)     # NEW — arbitrary-depth tree; path = materialized ('IN/MH/PN/…')
Department(id, entityId, name, state)                          # NEW
Team(id, departmentId, name, state)                            # NEW
Project(id, organizationId, name, state)                       # NEW (cross-cutting)
ProjectLink(projectId, entityId?, departmentId?)              # NEW (Project spans nodes)
```

### 6.3 Access control (new)

```
Role(id, organizationId, name, description, isSystem)          # was Role(tenantId…)
PermissionGroup(id, organizationId?, key, name)               # NEW (nullable org ⇒ platform-standard groups)
Permission(id, moduleId?, resourceKey, actionKey, capabilityKey?, description)  # extends today's Permission
  @@unique(resourceKey, actionKey)                            # keep; add moduleId/capabilityKey
RolePermission(roleId, permissionId)                          # unchanged shape
GroupPermission(groupId, permissionId)                        # NEW
RoleGroup(roleId, groupId)                                    # NEW (role composes groups)

Grant(id, principalId, roleId, scopeId, effect[ALLOW|DENY], startAt?, endAt?, state[ACTIVE|SUSPENDED], createdBy)
  # REPLACES Membership. Many per principal. Time-bounded. Suspendable.
Scope(id)                                                     # a scope is a set of dimension rows:
ScopeDimension(scopeId, dimension[ORGANIZATION|WORKSPACE|ENTITY|LOCATION|DEPARTMENT|TEAM|PROJECT|MODULE|CAPABILITY|RESOURCE|RECORD|FIELD],
               nodeId?, valueKey?, mode[EXACT|SUBTREE|EXCLUDE])
  # e.g. {LOCATION, nodeId=Pune, SUBTREE}, {DEPARTMENT, Marketing, EXACT}, {RESOURCE, 'lead', EXACT}

Policy(id, organizationId, effect[ALLOW|DENY], targetResourceKey?, targetActionKey?, targetField?,
       conditionExpr, scopeId)                                # ABAC overlay
```

### 6.4 Module / resource registry (new — the anti-hardcoding piece)

```
Module(id, key, name, version, lifecycleState)               # self-registered from manifest
ResourceDefinition(id, moduleId, key, name)                  # e.g. moduleId=sales, key='invoice'
ActionDefinition(id, resourceDefId, key)                     # e.g. 'read','approve'
# Permission rows are generated/linked FROM these definitions — never hand-seeded per industry.
```

### 6.5 Audit (evolve existing)

```
AuditEvent(… existing …)                                     # keep for data audit
IamAuditEvent(id, organizationId, actorPrincipalId, action[GRANT_CREATED|REVOKED|ROLE_EDITED|POLICY_CHANGED|
              NODE_SUSPENDED|PRINCIPAL_SUSPENDED|BREAK_GLASS|IMPERSONATION|SCOPE_NARROWED],
              targetRef, before, after, reason, at)          # NEW — feeds Effective Access history
MigrationAudit(step, startedAt, finishedAt, rowsAffected, checksumBefore, checksumAfter, status)  # NEW
```

### 6.6 Record hierarchy stamp (added to every business table)

```
# additive, nullable during transition; NOT NULL enforced only after backfill+verify
<any ERP table> += organizationId, workspaceId, entityId, locationId?, departmentId?, teamId?, projectId?
# Retain existing businessId/tenantId as compatibility columns until CONTRACT.
```

---

## 7. Concept mapping — today → target

| Today | Target | Transform |
|---|---|---|
| `Tenant` | `Organization` | Rename (or new table + backfill by id); slug/name carry over |
| `Business` | `Entity` (under a default `Workspace`) | New `Entity` rows 1:1 from `Business`; create one **Production** Workspace per Organization; `entityTemplateId` from `BusinessType` |
| `BusinessType` | `EntityTemplate` | Map rows; add `version`, `lifecycleState`, `key` |
| `User.tenantId` | `Principal.organizationId` | Backfill; drop hardcode (§8.6) |
| `User` (auth) | `Principal` (id = User.id) + Better Auth User | Create `Principal` per User; `kind=USER`, `state=ACTIVE` |
| `Role.tenantId` | `Role.organizationId` | Rename FK |
| `Permission(resource,action)` | `Permission(resourceKey,actionKey,moduleId?,capabilityKey?)` | Keep rows; link to `ResourceDefinition`/`ActionDefinition`; `moduleId` nullable until modules register |
| `Membership(userId,businessId,roleId)` | `Grant(principalId, roleId, scopeId{entity=businessId}, effect=ALLOW)` | **1 Membership → 1 Grant**; Scope = `{ENTITY EXACT businessId}`; drop the unique constraint |
| — (no scope) | `Scope` + `ScopeDimension` | New; legacy grants get entity-only scope (broadest legal, preserves current behavior) |
| — (no location) | `Location` tree | New; backfill a synthetic **Entity-root Location** per Entity (§8.3) |
| ERP record `businessId`/`tenantId` | hierarchy stamp | Backfill `organizationId=tenantId`, `entityId=businessId`, `workspaceId=<Production>`, others null → root (§8.3) |
| `AuditLog`/`AuditEvent` | + `IamAuditEvent` | Add IAM-change audit; keep data audit |

**Behavior-preserving default:** a migrated `Membership` becomes a Grant scoped to the whole Entity — i.e.
*exactly what the user could do before* (entity-wide role), no more, no less. Fine-grained scoping is an
**opt-in** the owner applies afterward, never forced by migration.

---

## 8. The nine questions, answered

### 8.1 How `Tenant→Business→Membership→Role→Permission` migrates to `Organization→Entity→Grant→Role×Scope→Policy`
Per §7 mapping. Each `Membership` → one `Grant{ role, scope=ENTITY(businessId), effect=ALLOW }`. `Role`
and `Permission` shapes survive (Role re-parented to Organization; Permission extended, not replaced).
`Policy` starts **empty** — no legacy equivalent, so nothing to migrate; owners add ABAC later. Net: the
*allow set is identical* on day one; the model just becomes expressible.

### 8.2 How existing records acquire hierarchy/location stamps
Additive nullable columns first, then idempotent backfill:
```
organizationId ← tenantId
entityId       ← businessId
workspaceId    ← the Organization's single 'Production' Workspace (created in expand)
locationId     ← the Entity-root Location (synthetic node, §8.3)  [deterministic, not NULL]
departmentId/teamId/projectId ← NULL  (means "unscoped on that dimension")
```
Backfill runs in batches, is re-runnable, and is verified by row-count parity + checksums
(`MigrationAudit`). `NOT NULL` is enforced on `organizationId/workspaceId/entityId/locationId` **only after**
verification passes.

### 8.3 How geographic subtree access is persisted (and legacy record placement)
- `Location(parentId, path)` with a **materialized path** (`'IN/MH/PN/PN-1'`). Subtree tests are cheap
  prefix matches (`record.path LIKE grant.path || '%'`).
- A Grant's location scope = `ScopeDimension{LOCATION, nodeId, SUBTREE}` → matches that node and all
  descendants (inheritance).
- **Legacy records** are stamped to a synthetic **Entity-root Location** (`path='<entity>/'`) per Entity —
  a real node, so behavior is deterministic: an entity-wide grant reaches them; a Pune-only grant does not
  (until an owner re-homes them). This avoids the ambiguity of NULL-means-everywhere.

### 8.4 How multiple roles per user are represented
Drop `Membership.@@unique([userId, businessId])`; model becomes `Principal 1───* Grant`. A user can hold
`Manager @ under Maharashtra` **and** `Auditor @ Salam Cola` **and** a time-boxed `Break-glass @ …`
simultaneously. Allows are additive; deny-grants/policies override (per Permission Engine).

### 8.5 How module/resource/action permissions are registered without hardcoding industries
`Module → ResourceDefinition → ActionDefinition` populated from each **module manifest** at load/registration
time; `Permission` rows are **derived from** these definitions, not seeded per industry. IAM stores opaque
`resourceKey/actionKey/moduleId/capabilityKey`. A Hospital module registering `patient.read` and a
Manufacturing module registering `machine.maintain` add rows through the *same* mechanism — **no IAM schema
change, no core code change**. This is the invariant that keeps OCTIEN industry-agnostic.

### 8.6 How the `tnt_demo_001` assumption is eliminated
- Remove the `databaseHooks.user.create.before` hardcode in `auth.ts`.
- Organization is resolved from **context**: an **invite token** carries `organizationId` (invited users
  join an existing Organization), or an **onboarding flow** creates a new Organization for a first user.
- `User.additionalFields.tenantId` → `organizationId`, populated from that context, not a constant.
- Existing data: `tnt_demo_001` is migrated to a real `Organization` (COSMY) with a proper id; a data fix
  renames/rekeys references. No user is ever again defaulted to a shared demo tenant.

### 8.7 How migration happens without breaking the frozen shell
**Expand→migrate→contract**, additive throughout:
```
Phase 0 EXPAND    add all new tables + nullable stamp columns + Production Workspace + Entity-root Locations.
                  Nothing reads them yet. Shell unaffected (new columns ignored).
Phase 1 BACKFILL  populate Principals, Entities, Grants(from Memberships), stamps. Idempotent, verified.
Phase 2 DUAL-READ engine runs in SHADOW behind a flag: computes decisions but the app still uses the
                  legacy Membership check; compare/telemetry only. Shell unaffected.
Phase 3 CUTOVER   flip flag → Permission Engine is authority; legacy check kept as fallback (flag off ⇒ revert).
Phase 4 CONTRACT  after a soak period, enforce NOT NULL, drop Membership + businessId/tenantId compat
                  columns (or keep as generated aliases if any un-migrated reader remains).
```
The **shell never changes**: it consumes navigation/session/theme, none of which depend on IAM internals.
Compatibility columns/views keep `businessId`/`tenantId` valid until Contract, so un-migrated queries keep
working during transition.

### 8.8 What must happen to Better Auth vs what belongs in OCTIEN IAM
```
BETTER AUTH  (authentication — the seam is User.id == Principal.id)
  • credentials (email/password now; OIDC/SAML/MFA later), Session issuance, Account, Verification
  • additional session fields: organizationId, workspaceId, scopeSetRef  (overlay, not a fork)
OCTIEN IAM   (authorization — everything the five models define)
  • Principal metadata (kind/state/org), Organization/Workspace/Entity/Location/Dept/Team/Project
  • Role/Permission/Group/Scope/Policy/Grant, Permission Engine, Effective Access, IAM audit
```
Rule: **do not fork Better Auth.** Authentication changes stay minimal (remove the tenant hardcode; add
session overlay fields; later, register SSO/MFA providers). Authorization is **never** pushed into Better
Auth — it lives entirely in OCTIEN IAM so it stays provider-agnostic and industry-agnostic.

### 8.9 Rollback & data-integrity strategy
- **Reversible by phase:** Phases 0–2 are additive/shadow → drop new objects to revert. Phase 3 is a
  **flag flip** → turn off ⇒ instant fallback to legacy Membership check. Only Phase 4 (Contract) is
  destructive and runs **only** after a clean soak.
- **Idempotent backfill** with `MigrationAudit` row-count parity + checksums; re-runnable safely.
- **Dual-write window:** during Phases 1–3, writes populate both legacy (`Membership`, `businessId`) and
  new (`Grant`, stamps) so either authority is consistent.
- **Integrity:** FK constraints on new relations; validation queries (every Membership has a matching
  Grant; every Record has a resolvable stamp; no orphan Locations); `NOT NULL` deferred until verified.
- **Fail-closed engine:** if the engine errors during shadow/cutover, decisions default DENY (Permission
  Engine §6.8) — never accidental allow.
- **Explicit rollback points** documented per phase; no phase begins until the prior phase's verification
  passes.

---

## 9. Migration phases at a glance

```
                 reversible ───────────────────────────────►│ destructive
 EXPAND ──► BACKFILL ──► DUAL-READ(shadow) ──► CUTOVER(flag) ─┼─► CONTRACT
   add       populate      compare only         engine is    │   drop legacy
 new objs   + verify       (shell unchanged)     authority    │   (after soak)
                                                  ▲ fallback   │
                                                  └─ flag off ─┘
```

---

## 10. Relationships (target)

```
Organization 1─* Workspace 1─* Entity 1─* Location(tree) / Department 1─* Team ;  Organization 1─* Project
Principal(id=User.id) 1─* Grant *─1 Role ;  Grant 1─1 Scope 1─* ScopeDimension ─*→ Node/valueKey
Organization 1─* Role / Policy ;  Module 1─* ResourceDefinition 1─* ActionDefinition ⇒ Permission
Record *─1 (organization,workspace,entity,location,department?,team?,project?)   # hierarchy stamp
Principal 1─* IamAuditEvent
```

---

## 11. Examples

1. **COSMY today → tomorrow.** `Tenant tnt_demo_001` → `Organization COSMY` (+ `Production` Workspace);
   `Business Salam Cola/UCO/Casa` → `Entity …`; each user's `Membership` → a `Grant` scoped to its Entity.
   Day-one access is identical; the owner can *then* narrow (e.g. Aisha → `under Pune, Marketing`).
2. **Add multi-role.** Give a manager a second `Grant{Auditor @ Salam Cola}` — impossible under the old
   unique constraint, trivial as a second Grant.
3. **Legacy invoice access.** An old invoice stamped to Salam Cola's Entity-root Location remains visible
   to the entity-wide manager; becomes invisible to a future Pune-only rep until re-homed — deterministic,
   no NULL ambiguity.
4. **Hospital tenant later.** A Clinical module registers `patient.*` via manifest → `ResourceDefinition`
   rows → grantable Permissions. Zero IAM migration; same tables COSMY uses.
5. **Rollback drill.** Mid-cutover anomaly → flip the engine flag off → app instantly reverts to the
   legacy Membership check while new tables sit inert; investigate; re-enable.

---

## 12. Security boundaries

- **Migration can only *preserve or narrow* access on day one** — a Membership maps to an entity-scoped
  Grant, never a broader one. No user silently gains reach.
- **Fail-closed during transition** — shadow/cutover errors ⇒ DENY, never allow.
- **Isolation preserved** — `organizationId` backfilled from `tenantId`; no record loses its boundary.
- **No destructive step before verification** — Contract runs only after parity + soak.
- **Better Auth surface stays minimal** — authentication isn't entangled with authorization.
- **No industry data in schema** — Entity/Location/Department/etc. are generic; COSMY names are rows.

---

## 13. Edge cases (migration-level)

| # | Case | Handling |
|---|---|---|
| 1 | User with **no** Membership | Principal created, zero Grants → authorized for nothing (valid; default deny) |
| 2 | Membership pointing at a deleted Business | Skipped + flagged in `MigrationAudit`; no orphan Grant |
| 3 | Duplicate `(userId, businessId)` (shouldn't exist due to unique) | Constraint guarantees ≤1; if found pre-migration, dedupe step logs it |
| 4 | Records with NULL `businessId` (shared/global rows) | Stamped to Organization + a designated Workspace; location-root; flagged for owner review |
| 5 | Two tenants collide on a slug during rename | Rekey with new ids (not slugs); slugs are display, ids are identity |
| 6 | New writes during backfill | Dual-write window keeps legacy + new consistent; backfill is idempotent over the delta |
| 7 | Better Auth session issued pre-migration | On next request, overlay fields (org/workspace) resolved from Principal; no forced re-login |
| 8 | Engine flag flipped on with incomplete backfill | Guard: cutover blocked until verification query returns parity |
| 9 | Un-migrated module still seeds Permissions by hand | Allowed transitionally (`moduleId` nullable); reconciled when the module registers a manifest |
| 10 | Contract attempted with a lingering `businessId` reader | Keep column as a generated alias until the reader is migrated; defer drop |

---

## 14. Verification criteria

- [ ] Every existing `Membership` has exactly one equivalent `Grant`; resulting allow-set is identical
      pre/post (behavior-preserving) — proven by a decision-diff over sampled requests.
- [ ] Every Record resolves a complete, non-NULL hierarchy stamp after backfill.
- [ ] A user can hold multiple Grants; the old unique constraint is gone.
- [ ] Location subtree access works by path prefix; an ancestor grant reaches descendants.
- [ ] A module can register Resources/Actions and gain grantable Permissions with **no** IAM schema change.
- [ ] `tnt_demo_001` no longer appears in `auth.ts` or as a default; Organizations resolve from context.
- [ ] The frozen shell renders and functions identically at every phase (0–4).
- [ ] Better Auth tables/flows are unchanged except the removed hardcode + additive session fields.
- [ ] Each phase has a tested rollback; only Contract is destructive and gated on verification + soak.
- [ ] No industry/entity/client literal exists in any IAM table definition.

---

## 15. Open decisions

1. **Rename-in-place vs new-table-+-backfill** for `Tenant→Organization` / `Business→Entity` — leaning
   *new tables + backfill + compat views* (safest rollback), at the cost of a longer transition.
2. **Scope storage:** normalized `ScopeDimension` rows (queryable, joins) vs a JSON scope blob (flexible,
   opaque) — leaning normalized for the engine's `scopeFilter` generation.
3. **Legacy location placement:** synthetic Entity-root node (recommended) vs NULL-means-entity-wide — pin
   before backfill.
4. **Workspace default:** one `Production` per Organization now; when/how are Sandbox/Demo introduced?
5. **Dual-write duration & soak length** before Contract (risk vs cleanup speed).
6. **Permission dedup:** existing global `Permission(resource,action)` vs per-module keys — how to
   reconcile the current flat catalog with `moduleId` linkage without breaking `permission-catalog` strings
   already used in code.
7. **`createdBy/updatedBy` strings → Principal FKs** — migrate now (integrity) or leave as opaque strings
   (less churn)?
8. **Impersonation/break-glass tables** — model now or in IAM implementation?

---

## 16. Where this sits

```
Identity · Organization · Access Control · Permission Engine · Effective Access   (WHAT IAM is)   ✅
        │
        ▼
IAM DATA ARCHITECTURE  (this doc — HOW the DB becomes that, reversibly)           ← you are here ✅
        │
        ▼
IAM IMPLEMENTATION (Prisma · Better Auth seam · engine · enforcement · audit)     ← next, on approval
        │
        ▼
Admin Access Control UI → Module Registry → Module redesigns
```

The login page stays as-is; later IAM work touches **authentication plumbing only where necessary**
(remove the tenant hardcode, add session fields) and does **not** reopen the login design.

**Invariant, restated:** OCTIEN IAM authorizes **generic** Resources and Actions registered by modules — it
must never become a COSMY/Salam Cola-specific permission system. That is what lets one core serve a
hospital, university, manufacturer, retailer, NGO, government, or COSMY without a rebuild.

---

**Architecture only. No Prisma, no Better Auth changes, no migration executed. Submitted for review before
any implementation.**
