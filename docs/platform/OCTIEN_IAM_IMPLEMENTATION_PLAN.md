# OCTIEN IAM Implementation Plan — The Pre-Prisma Blueprint

**Status:** PLANNING / ARCHITECTURE ONLY — **no Prisma files, no migrations, no Better Auth changes, no
code is applied by this document.** All schema shown is **illustrative** (markdown) to fix shape, indexes,
and sequence. This is the final review gate before the backend changes.
**Companions (the approved set):** `OCTIEN_IDENTITY_ARCHITECTURE.md`, `OCTIEN_ORGANIZATION_MODEL.md`,
`OCTIEN_ACCESS_CONTROL_MODEL.md`, `OCTIEN_PERMISSION_ENGINE.md`, `OCTIEN_EFFECTIVE_ACCESS_MODEL.md`,
`OCTIEN_IAM_DATA_ARCHITECTURE.md`, `OCTIEN_PLATFORM_CORE.md`, `OCTIEN_DOMAIN_MODEL.md`.
**Depends on:** CAP-SHELL V1.0 (frozen) — must not reopen or break the shell.

> This plan turns the approved data architecture into a concrete, reviewable implementation blueprint:
> exact entities, relationships, authorization-query indexes, migration/backfill/dual-read/dual-write
> steps, parity tests, rollback checkpoints, the Better Auth seam, enforcement points, a security test
> matrix, scoped-query performance, and migration risks. **Nothing is executed here.**

---

## 0. Locked decisions (approved — bind this plan)

| Decision | Ruling |
|---|---|
| Rename-in-place vs new tables | **New target structures + controlled backfill; preserve legacy columns during migration.** No in-place rename. |
| Scope storage | **Normalized scope dimensions** (rows), not one opaque JSON blob. |
| Legacy locations | **Synthetic Entity-root Location** per Entity. |
| Permission catalog | **`Module → ResourceDefinition → ActionDefinition` is the canonical source** of Permissions. |
| Better Auth | **Strictly authentication + session identity.** Not forked. |
| Authorization | **OCTIEN IAM owns all authorization.** |
| Migration | **Expand → Backfill → Shadow/Dual-read → Flagged Cutover → Contract.** |
| Ordering guardrail | **Do not delete `Business`/`Tenant`/`Membership` until parity is proven** for existing users. |

**Prime invariant (repeat everywhere):** *the UI is not the security boundary — the data/authorization
boundary is.* A user restricted to `Salam Cola → Maharashtra → Pune → Marketing → CRM` must be unable to
retrieve Finance records via **server action, API, query, direct URL, search, export, report, or AI tool** —
not merely have them hidden in the sidebar.

---

## 1. Purpose & non-goals

**Purpose:** give a single document a reviewer can approve to authorize the *first* backend change, with
every entity, index, phase, test, checkpoint, and risk enumerated.

**Non-goals (explicitly out of scope for this doc):** writing Prisma models, running migrations, editing
`auth.ts`, building the engine or the admin UI, and any module redesign. Those follow, in the order in §12,
**after** this plan is approved.

---

## 2. Implementation order (approved sequence)

```
IAM DATA ARCHITECTURE ✅
        │
        ▼
(this) IMPLEMENTATION PLAN ✅ ── review gate ──►
        ▼
1 Prisma target model  →  2 Migration/backfill  →  3 IAM Permission Engine  →  4 Better Auth bridge
        ▼
5 Enforcement boundaries (server actions · API · queries · direct URL · AI tools)
        ▼
6 Effective Access API  →  7 Admin Access UI (LAST)
```

Rule: **the Admin UI is built last**, only after the effective-access engine demonstrably works — so we
never design an interface around authorization behavior that may still change.

---

## 3. Target Prisma entities — introduce / change / preserve

Legend: **[NEW]** create · **[CHG]** additive change · **[KEEP]** unchanged · **[DROP@Contract]** removed only
in the final phase.

### 3.1 Identity

```prisma
// [KEEP] Better Auth owns these; do NOT restructure.
model User         { id … name email emailVerified image /* [CHG] tenantId → organizationId (additive alias first) */ }
model Session      { id userId token expiresAt ipAddress userAgent
                     // [CHG] additive overlay fields:
                     organizationId? workspaceId? scopeSetRef? authLevel? }
model Account      { … }        // credentials (pwd now; OIDC/SAML later)
model Verification { … }

// [NEW] OCTIEN authorization identity; 1:1 with User (id == User.id).
model Principal {
  id               String  @id                 // == User.id
  kind             PrincipalKind               // USER | AI_AGENT | SERVICE
  organizationId   String
  state            PrincipalState              // INVITED | ACTIVE | SUSPENDED | LOCKED | OFFBOARDED
  defaultWorkspaceId String?
  subjectPrincipalId String?                    // AI agent acts on behalf of (a User principal)
  createdAt DateTime @default(now())
  grants           Grant[]
  @@index([organizationId, state])
}
```

### 3.2 Organization structure

```prisma
model Organization { id String @id @default(cuid()) name String slug String @unique }  // [NEW] (was Tenant)
model Workspace    { id String @id organizationId String name String kind WorkspaceKind state NodeState
                     @@index([organizationId, state]) }                                  // [NEW]
model Entity       { id String @id organizationId String workspaceId String entityTemplateId String?
                     name String slug String @unique status String
                     /* branding/finance fields carried from Business */
                     @@index([workspaceId]) @@index([organizationId]) }                  // [NEW] (was Business)
model EntityTemplate { id String @id key String name String version String lifecycleState String }  // [NEW] (was BusinessType)
model Location    { id String @id entityId String parentId String? type String name String
                    path String state NodeState
                    @@index([entityId]) @@index([entityId, path]) }                      // [NEW] materialized path
model Department  { id String @id entityId String name String state NodeState @@index([entityId]) }  // [NEW]
model Team        { id String @id departmentId String name String state NodeState @@index([departmentId]) } // [NEW]
model Project     { id String @id organizationId String name String state NodeState @@index([organizationId]) } // [NEW]
model ProjectLink { id String @id projectId String entityId String? departmentId String? @@index([projectId]) } // [NEW]
```

### 3.3 Access control

```prisma
model Role           { id String @id organizationId String name String description String? isSystem Boolean @default(false)
                       @@unique([organizationId, name]) }                                // [CHG] tenantId → organizationId
model PermissionGroup { id String @id organizationId String? key String name String @@unique([organizationId, key]) } // [NEW]
model Permission      { id String @id moduleId String? resourceKey String actionKey String capabilityKey String?
                        description String? @@unique([resourceKey, actionKey]) }         // [CHG] +moduleId/capabilityKey
model RolePermission  { id String @id roleId String permissionId String @@unique([roleId, permissionId]) } // [KEEP]
model GroupPermission { id String @id groupId String permissionId String @@unique([groupId, permissionId]) } // [NEW]
model RoleGroup       { id String @id roleId String groupId String @@unique([roleId, groupId]) }            // [NEW]

model Grant {                                                                            // [NEW] replaces Membership
  id           String  @id @default(cuid())
  principalId  String
  roleId       String
  scopeId      String
  effect       Effect                                   // ALLOW | DENY
  startAt      DateTime?
  endAt        DateTime?
  state        GrantState                               // ACTIVE | SUSPENDED
  createdBy    String
  createdAt    DateTime @default(now())
  @@index([principalId, state])
  @@index([roleId])
}
model Scope          { id String @id @default(cuid()) }                                   // [NEW]
model ScopeDimension {                                                                    // [NEW] normalized (approved)
  id        String @id @default(cuid())
  scopeId   String
  dimension ScopeDim                                    // ORGANIZATION|WORKSPACE|ENTITY|LOCATION|DEPARTMENT|TEAM|PROJECT|MODULE|CAPABILITY|RESOURCE|RECORD|FIELD
  nodeId    String?                                     // for structural dims (Location/Entity/…)
  valueKey  String?                                     // for RESOURCE/FIELD/CAPABILITY keys
  mode      ScopeMode                                   // EXACT | SUBTREE | EXCLUDE
  @@index([scopeId])
  @@index([dimension, nodeId])
}
model Policy {                                                                            // [NEW] ABAC overlay
  id String @id @default(cuid()) organizationId String effect Effect
  targetResourceKey String? targetActionKey String? targetField String?
  conditionExpr String scopeId String
  @@index([organizationId])
}
```

### 3.4 Module / resource registry (canonical permission source)

```prisma
model Module             { id String @id key String @unique name String version String lifecycleState String }      // [NEW]
model ResourceDefinition { id String @id moduleId String key String name String @@unique([moduleId, key]) }         // [NEW]
model ActionDefinition   { id String @id resourceDefId String key String @@unique([resourceDefId, key]) }           // [NEW]
// Permission rows are DERIVED from these (moduleId, resourceKey=Resource.key, actionKey=Action.key).
```

### 3.5 Audit

```prisma
model IamAuditEvent  { id String @id organizationId String actorPrincipalId String action IamAuditAction
                       targetRef String? before Json? after Json? reason String? at DateTime @default(now())
                       @@index([organizationId, at]) @@index([actorPrincipalId, at]) }   // [NEW]
model MigrationAudit { id String @id step String startedAt DateTime finishedAt DateTime? rowsAffected Int?
                       checksumBefore String? checksumAfter String? status String }      // [NEW]
model AuditEvent     { … }   // [KEEP] data audit
```

### 3.6 Record hierarchy stamp (every business table)

```prisma
// [CHG] additive, nullable during transition; enforced NOT NULL only post-verify.
// organizationId, workspaceId, entityId, locationId?, departmentId?, teamId?, projectId?
// [KEEP] businessId, tenantId retained as compatibility columns until Contract.
// Composite index for scope filtering (see §5).
```

### 3.7 Legacy tables during transition

```
Tenant     [KEEP → DROP@Contract]   backfilled into Organization
Business   [KEEP → DROP@Contract]   backfilled into Entity
BusinessType [KEEP → DROP@Contract] backfilled into EntityTemplate
Membership [KEEP → DROP@Contract]   backfilled into Grant; unique constraint retired at Contract
```

---

## 4. Relationships (target ER overview)

```
Organization 1─* Workspace 1─* Entity 1─* Location(tree, parentId/path)
Entity 1─* Department 1─* Team ;  Organization 1─* Project *─ ProjectLink ─* {Entity, Department}
Principal(id=User.id) 1─* Grant *─1 Role ; Grant 1─1 Scope 1─* ScopeDimension →(nodeId|valueKey)
Organization 1─* Role / Policy / PermissionGroup
Module 1─* ResourceDefinition 1─* ActionDefinition ⇒ Permission(resourceKey, actionKey, moduleId)
Role *─* Permission (via RolePermission) ; Role *─* PermissionGroup (via RoleGroup) *─* Permission (via GroupPermission)
Record *─1 {organization, workspace, entity, location, department?, team?, project?}   // stamp
Principal 1─* IamAuditEvent
```

---

## 5. Indexes required for authorization queries (perf-critical)

Authorization runs on **every** request; these indexes are not optional.

| Query pattern | Index | Why |
|---|---|---|
| Resolve a principal's active grants | `Grant(principalId, state)` + partial on time window | Hot path of every `decide()` |
| Scope dimension lookup for a grant | `ScopeDimension(scopeId)` | Assemble a grant's scope cheaply |
| Structural-node scope match | `ScopeDimension(dimension, nodeId)` | Map grants → nodes |
| **Location subtree match** | `Location(entityId, path)` (B-tree; supports `path LIKE 'prefix%'`) | Core inheritance test |
| Record scope filtering | **composite** on each business table: `(organizationId, workspaceId, entityId, locationId, departmentId)` | The `scopeFilter` predicate pushed into queries |
| Record path prefix (if stamping path on records) | index on record `locationPath` | Subtree filter on lists |
| Permission lookup | `Permission(resourceKey, actionKey)` (already unique) | Key→permission |
| Role composition | `RolePermission(roleId)`, `RoleGroup(roleId)`, `GroupPermission(groupId)` | Expand a role to permissions |
| Registry resolution | `ResourceDefinition(moduleId, key)`, `ActionDefinition(resourceDefId, key)` | Module registration & catalog build |
| Effective-access / audit reads | `IamAuditEvent(organizationId, at)`, `(actorPrincipalId, at)` | History & recertification |
| Org isolation on every table | leading `organizationId` in composite indexes | Isolation predicate is always present |

> Design note: store a **materialized `path`** on `Location` (and optionally denormalize `locationPath`
> onto records) so subtree membership is an index-friendly prefix scan, never a recursive CTE per request.

---

## 6. Migration sequence (Expand → Backfill → Shadow → Cutover → Contract)

```
PHASE 0 — EXPAND  (additive only; nothing reads new objects)
  • create all [NEW] tables (Principal, Organization, Workspace, Entity, EntityTemplate, Location,
    Department, Team, Project, Role→org, PermissionGroup, Grant, Scope, ScopeDimension, Policy,
    Module/ResourceDefinition/ActionDefinition, IamAuditEvent, MigrationAudit)
  • add nullable stamp columns + Session overlay fields
  • add all §5 indexes
  • ✅ shell + app unaffected (new columns ignored)

PHASE 1 — BACKFILL  (idempotent, batched, verified)
  • Organization ← Tenant ; Workspace(Production) per Organization ; EntityTemplate ← BusinessType
  • Entity ← Business (link workspace + template) ; Location(Entity-root synthetic) per Entity
  • Principal ← User (id=User.id, kind=USER, state=ACTIVE, organizationId ← tenantId)
  • Role.organizationId ← Role.tenantId
  • Grant ← Membership : one Grant{ role, scope=ENTITY(businessId) EXACT, effect=ALLOW }
  • Record stamps ← organizationId=tenantId, entityId=businessId, workspaceId=Production, locationId=Entity-root
  • Permission ↔ ResourceDefinition/ActionDefinition reconciliation (moduleId nullable for legacy)
  • write MigrationAudit rows (counts + checksums)

PHASE 2 — SHADOW / DUAL-READ  (engine computes, app still uses legacy)
  • Permission Engine runs behind a flag in SHADOW: logs decisions, does NOT enforce
  • parity harness compares engine vs legacy Membership check (see §8)
  • dual-write window begins: writes update BOTH legacy (Membership/businessId) AND new (Grant/stamps)
  • ✅ shell + app behavior identical

PHASE 3 — FLAGGED CUTOVER  (engine becomes authority; legacy fallback)
  • flip flag → decide()/scopeFilter() enforce ; legacy check retained as fallback (flag off ⇒ revert)
  • monitor deny/allow telemetry, error rates (fail-closed on engine error)

PHASE 4 — CONTRACT  (destructive; only after clean soak + parity)
  • enforce NOT NULL on organizationId/workspaceId/entityId/locationId
  • drop Membership (+ its unique constraint), Tenant, Business, BusinessType
  • drop compatibility columns businessId/tenantId (or keep as generated aliases if a reader remains)
```

**No phase begins until the previous phase's verification passes.** Only Phase 4 is irreversible.

---

## 7. Backfill strategy

- **Idempotent & re-runnable:** upsert by deterministic keys (e.g. `Entity.id = Business.id`,
  `Principal.id = User.id`) so re-running converges, never duplicates.
- **Batched:** chunked by organization/entity to bound transaction size and lock footprint on live Neon.
- **Deterministic placement:** legacy records → Entity-root Location (no NULL ambiguity); shared/global
  rows (NULL `businessId`) → Organization + designated Workspace + flagged for owner review.
- **Behavior-preserving:** each Membership → an entity-scoped Grant = the *same* reach as today. Narrowing
  is a later owner action, never forced by backfill.
- **Verified:** `MigrationAudit` records row-count parity (`count(Grant)==count(Membership)`), checksums,
  and orphan checks (every Membership has a Grant; every Record resolves a full stamp).

---

## 8. Dual-read / dual-write & parity tests

**Dual-read (Shadow):** the engine answers in parallel with the legacy check; both results are logged.

**Dual-write:** during Phases 1–3, mutations write legacy *and* new stores so either can be authoritative
without divergence; removed at Contract.

**Parity harness (the gate to cutover):**
```
For a representative population (all existing users × sampled resources/actions × sampled records):
    legacy = canAccess_legacy(user, action, record)      // Membership-based
    engine = decide(principal, action, record)            // new IAM
    assert engine == legacy      // MUST match for 100% of the behavior-preserving set
Report: mismatches by (user, resource, action, reason). Zero mismatches required to flip the flag.
```
Parity must hold for **effective access**, not just point checks: also compare `scopeFilter(user,
resource)` result sets vs legacy `where businessId=…` result sets (row-set equality) for list endpoints.

---

## 9. Rollback checkpoints

| Phase | Rollback action | Reversible? |
|---|---|---|
| 0 Expand | Drop the new tables/columns/indexes | ✅ fully |
| 1 Backfill | Truncate new tables; legacy untouched; re-run later | ✅ fully |
| 2 Shadow | Turn off shadow flag; stop dual-write | ✅ fully |
| 3 Cutover | **Flip enforcement flag off ⇒ instant revert to legacy check** | ✅ instant |
| 4 Contract | Restore from pre-Contract backup only (destructive) | ⚠️ backup-only |

Each checkpoint has an explicit "go/no-go" tied to §14 verification. Cutover is guarded: the flag **cannot**
be flipped on until the parity harness reports zero mismatches.

---

## 10. Better Auth integration boundary

```
BETTER AUTH (authentication only — the seam is Principal.id == User.id)
  owns:  email/password (now), Session issuance, Account, Verification, future OIDC/SAML/MFA
  change: (a) remove databaseHooks tnt_demo_001 hardcode → organizationId from invite/onboarding context
          (b) add Session overlay fields organizationId/workspaceId/scopeSetRef/authLevel (additive)
  do NOT: put any Role/Permission/Scope/Policy logic here; do NOT fork Better Auth

OCTIEN IAM (authorization only)
  owns:  Principal metadata, Organization/Workspace/Entity/Location/Dept/Team/Project,
         Role/Permission/Group/Scope/Policy/Grant, Permission Engine, Effective Access, IAM audit
```
On login, Better Auth authenticates → OCTIEN resolves the Principal, Organization, Workspace, and a
`scopeSetRef` → written to the session overlay. Authorization is evaluated fresh per request against current
grants (session is not a permission cache).

---

## 11. Enforcement points (no bypass) — the boundary is the data layer

Every channel funnels through the **one** engine (`decide()` for point checks, `scopeFilter()` for sets):

| Channel | Enforcement |
|---|---|
| **Server actions** | wrap with `decide()`; mutations re-check target stamp |
| **API / route handlers** | `decide()` on the action; list endpoints apply `scopeFilter()` |
| **Database queries** | `scopeFilter()` predicate pushed into the query — the authoritative boundary |
| **Direct URL access** | same `decide()`/filter with `id=?`; a permitted-looking URL to a denied record ⇒ DENY |
| **Global search** | search results pass through `scopeFilter()`; denied records never surface |
| **Exports / reports** | generated from scoped queries only; no "export bypasses filter" path |
| **AI tools** | evaluated as the subject principal; `AI_effective ⊆ subject_effective`; then same data boundary |
| **UI (sidebar/buttons)** | convenience only — **never trusted for security** |

Because the **query filter** is the last line, a forgotten UI or even API check cannot leak rows — the DB
simply won't return them.

---

## 12. Security test matrix (must pass before cutover)

Subject: an employee restricted to `Salam Cola → Maharashtra → Pune → Marketing → {Sales,CRM,Marketing}`,
resources `{Customer, Lead, Campaign}`. Expected = **DENY / filtered-out** for everything outside that scope,
across **every** channel.

| # | Attempt (channel → target) | Expected |
|---|---|---|
| 1 | Server action → read a Finance invoice | DENY (no grant for `invoice.read`) |
| 2 | API GET `/api/invoices/:id` (Finance) | DENY |
| 3 | List query `/api/customers` | returns **only** Pune Salam-Cola customers (scopeFilter) |
| 4 | Direct URL to a **Nagpur** lead (in-scope resource, out-of-scope location) | DENY (path prefix miss) |
| 5 | Direct URL to a **COSMY UCO** customer (other Entity) | DENY (entity mismatch) |
| 6 | Global search for "invoice"/"payroll" | zero Finance/HR results |
| 7 | Export "all customers" | file contains only in-scope rows |
| 8 | Report "revenue by entity" (cross-entity) | DENY unless a reporting grant exists |
| 9 | AI tool "list overdue invoices" | DENY (subject lacks `invoice.read`) |
| 10 | AI tool "list my leads" | returns only in-scope Pune leads |
| 11 | Field read `customer.creditLimit` (if a redaction policy applies) | field redacted / DENY |
| 12 | Tamper: pass another org's id in a body param | DENY (isolation gate) |
| 13 | Expired temporary grant reuse | DENY (time window) |
| 14 | Suspended principal, any channel | DENY at identity gate |

Every row is asserted at the **data boundary**, not by checking the UI. A green matrix + zero parity
mismatches is the cutover precondition.

---

## 13. Performance considerations for scoped queries

- **Materialized `path`** on Location → subtree tests are index-friendly `LIKE 'prefix%'`, never recursive
  CTEs per request.
- **Denormalized stamp columns** on records (indexed composite `org,workspace,entity,location,dept`) → the
  scope predicate is a plain indexed WHERE, cheap on large tables.
- **Resolve-once per request:** load the principal's active grants once, compile a single `scopeFilter`
  predicate, reuse across the request (no per-row `decide()`).
- **Session-scoped grant cache** keyed by `scopeSetRef`; **bump `scopeSetRef`** on any grant/role/policy
  change to invalidate — decisions stay fresh without re-querying grants every call.
- **Predicate pushdown, not post-filter:** always filter in the DB; never fetch-then-drop (correctness *and*
  performance).
- **Bounded ABAC:** condition expressions that require joins are constrained (see Permission Engine open
  decision) to keep evaluation O(1)-ish per record.
- **Index-only isolation:** leading `organizationId` on composite indexes keeps the ever-present isolation
  predicate fast.

---

## 14. Verification / exit criteria (per gate)

- [ ] **Expand:** all new tables/indexes/columns exist; app + shell behavior unchanged; no reads of new
      objects yet.
- [ ] **Backfill:** `count(Grant)==count(Membership)`; every Record resolves a full non-NULL stamp; every
      user has a Principal; `MigrationAudit` checksums recorded; no orphans.
- [ ] **Shadow:** parity harness = **0 mismatches** on point checks *and* list result-sets for the
      behavior-preserving population.
- [ ] **Security matrix (§12):** all rows pass at the data boundary.
- [ ] **Cutover:** engine enforces; fallback flag verified to instantly revert; error rate nominal;
      fail-closed confirmed.
- [ ] **Contract (only then):** NOT NULL enforced; legacy tables/columns dropped; backup taken first.
- [ ] Shell renders/functions identically throughout.
- [ ] No IAM table definition contains any industry/entity/client literal.

---

## 15. Data migration risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Backfill mis-stamps records (wrong entity/location) | wrong access after cutover | Deterministic mapping from `businessId`; parity harness catches divergence before enforcement |
| NULL `businessId` global rows | ambiguous placement | Explicit rule (Org + designated Workspace + Entity-root) + owner-review flag |
| Parity gaps from legacy quirks (e.g. implicit access in code) | cutover blocked or unsafe | Shadow phase surfaces every mismatch; fix mapping, not the test |
| Dual-write drift under concurrency | inconsistent authority | Single transaction per mutation writes both stores; reconciliation check in `MigrationAudit` |
| Performance regression on large ERP tables | slow lists | Composite stamp indexes + materialized path + predicate pushdown (§13); load-test before cutover |
| `permission-catalog` strings already used in code vs new `moduleId` linkage | broken existing checks | Keep `Permission(resourceKey,actionKey)` unique stable; `moduleId` additive; reconcile, don't rename keys |
| Better Auth session assumptions (tenantId field) | login/session breakage | Additive overlay; keep `tenantId` as alias of `organizationId` until Contract |
| Contract run too early | data loss | Hard gate: Contract only after parity=0, security matrix green, soak clean, backup taken |
| Shell accidentally coupled to `businessId` | shell breaks mid-migration | Compatibility columns/aliases retained until Contract; verify shell each phase |

---

## 16. Open items to confirm during Prisma-model step (not blockers)

1. `createdBy/updatedBy` string columns → convert to `Principal` FKs now, or defer? (Leaning: defer;
   opaque strings still resolve via retained Principal.)
2. Whether to denormalize `locationPath` directly onto high-volume records (faster list filters) vs join to
   `Location` (less write churn).
3. Exact `conditionExpr` representation for `Policy` (constrained DSL vs parameterized templates) — pin
   before ABAC is enforced.
4. Impersonation & break-glass tables — introduce in Expand or in a later IAM increment.
5. Sandbox/Demo Workspace introduction timing (Production-only at first).

---

## 17. Where this sits

```
Platform Core → Domain Model → IAM Architecture (5 docs) → IAM Data Architecture → IAM IMPLEMENTATION PLAN (this)
      │
      ▼ (on approval of THIS plan)
1 Prisma target model → 2 Migration/backfill → 3 Permission Engine → 4 Better Auth bridge
      → 5 Enforcement boundaries → 6 Effective Access API → 7 Admin Access UI (last)
```

**This is the safest point to begin changing the backend — but this document changes nothing.** It is
submitted for review; only after approval does the first Prisma model land, following §6 exactly, gated by
§9 checkpoints and §12/§14 verification.

**Prime invariant restated:** the UI is not the security boundary — the data/authorization boundary is; and
OCTIEN IAM authorizes **generic, module-registered** Resources/Actions, never a COSMY/Salam-Cola-specific
permission system.
