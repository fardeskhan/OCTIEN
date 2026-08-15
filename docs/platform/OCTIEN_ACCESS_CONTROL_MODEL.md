# OCTIEN Access Control Model — What Access Exists

**Status:** DESIGN / ARCHITECTURE ONLY — no code, no Prisma, no middleware, no UI.
**Companions:** `OCTIEN_PLATFORM_CORE.md`, `OCTIEN_DOMAIN_MODEL.md` (binding vocabulary),
`OCTIEN_IDENTITY_ARCHITECTURE.md`, `OCTIEN_ORGANIZATION_MODEL.md`, `OCTIEN_PERMISSION_ENGINE.md`,
`OCTIEN_EFFECTIVE_ACCESS_MODEL.md`.
**Depends on:** CAP-SHELL V1.0 (frozen).

> Identity says **who** (Principal). Organization says **where** (the node map). This document says
> **what access can be expressed and how it is granted** — the vocabulary of Permissions, Roles, Scopes,
> and Policies. It is **RBAC + ABAC**, not "RBAC". The *evaluation* of these into ALLOW/DENY is the
> Permission Engine; here we define the **shape** of grants.

---

## 1. Purpose

Define, precisely and industry-agnostically, the access primitives:

- **Permission** — an atomic `resource.action` capability.
- **Resource** & **Action** — the type and the verb, registered by **Modules** (never hardcoded in IAM).
- **Role** & **Permission Group** — named bundles assignable to Principals.
- **Scope** — *where* a Role applies, across every dimension.
- **Policy** — conditional ALLOW/DENY rules (ABAC) layered on top of role grants.
- **Grant / Assignment** — how a Principal actually receives access (Role × Scope, with time bounds).

And the invariants: **default deny**, **deny overrides allow**, **one gate for humans and AI**, and
**IAM contains no module/industry knowledge**.

---

## 2. Current-state audit

| Concept | Today (`schema.prisma`) | Gap |
|---|---|---|
| Permission | `Permission(resource, action)` global, `@@unique([resource, action])` | A flat catalog exists ✔ but not linked to Modules/Capabilities; no scope notion |
| Role | `Role(tenantId, name, isSystem)` | Tenant-scoped roles ✔; but purely a permission bag |
| Role→Permission | `RolePermission` | ✔ many-to-many |
| Assignment | `Membership(userId, businessId, roleId)`, `@@unique([userId, businessId])` | **One role per user per Business** — no multi-role, no sub-Entity scope |
| Scope | none | **No Location/Dept/Team/Project/Module/Resource/Record/Field scoping at all** |
| Policy (ABAC) | none | **No conditional/attribute rules, no deny rules** |
| Deny | none | Only implicit "absence of grant"; no explicit deny |
| Resource registration | Permissions are seeded rows | **Modules don't register their resources/actions**; catalog is manual |
| Field-level | none | **Missing** |

**Net:** today is **coarse RBAC** — *User → one Role (bag of resource.action) → one Business*. It cannot
express "Salam Cola × Pune × Marketing × these modules × these resources", cannot deny, and has no
attribute conditions. This document defines the model that can.

---

## 3. Problems

1. **No scope.** A grant applies to a whole Business or nothing; geography, department, team, project,
   module, resource-instance, and field cannot narrow it.
2. **Single role per Business.** Real employees hold multiple roles; the current unique constraint forbids
   it.
3. **No ABAC / conditions.** "Only invoices in your region", "only records you own", "amount < 10k" are
   inexpressible.
4. **No explicit deny.** Enterprise policy needs carve-outs ("everything in Finance *except* Payroll").
5. **IAM is coupled to seeded permissions**, not to module-registered Resources/Actions — so a new
   Hospital module can't contribute `patient.read` without hand-seeding.
6. **No field-level control** for sensitive data (salary, medical notes).
7. **Roles are permission-only bags** with no notion of scope templates or composition beyond flat lists.

---

## 4. Requirements

- **R1** A **Permission** is `resource.action` (optionally `capability.action`), atomic and additive.
- **R2** **Resources and Actions are registered by Modules** via their manifest; IAM authorizes whatever
  is registered and knows none of it intrinsically.
- **R3** A **Role** composes Permissions/Permission Groups; a Principal may hold **many** Roles.
- **R4** A **Scope** constrains a Role assignment across **all** dimensions:
  `Organization · Workspace · Entity · Location · Department · Team · Project · Module · Capability ·
  Resource · Record · Field`.
- **R5** A **grant** = **Role × Scope** attached to a Principal, optionally **time-bounded** (start/end)
  and **suspendable**.
- **R6** Support **explicit DENY** grants/policies; **deny overrides allow** everywhere.
- **R7** **ABAC Policies**: conditional rules over attributes of {Principal, Record, Scope, environment}
  producing ALLOW/DENY (e.g. ownership, amount thresholds, record state, time).
- **R8** **Default deny**: absence of a matching allow ⇒ DENY.
- **R9** **Field-level** and **Record-level** control are expressible as scope dimensions / policy targets.
- **R10** The **same** Role/Permission/Scope/Policy model authorizes **AI Tools** and API calls, not just
  UI.
- **R11** **Owner** is the root authority able to define/grant/revoke all of the above (owner powers §8).
- **R12** No industry/entity/client term appears in any access primitive; those are only ever **values**
  inside a Scope (e.g. `entity = <Salam Cola id>`).

---

## 5. Terminology (this document)

Per `OCTIEN_DOMAIN_MODEL.md §2`, made precise for grants:

| Term | Definition |
|---|---|
| **Permission** | Atomic capability `resource.action` (e.g. `invoice.approve`, `patient.read`). The unit of "may do". |
| **Action** | The verb on a Resource: `read · create · update · delete · approve · export · manage · …` (open set, module-declared). |
| **Resource** | A business object **type** registered by a Module (`invoice`, `customer`, `patient`, `machine`). IAM treats it as an opaque key. |
| **Permission Group** | A named bundle of Permissions (e.g. `Invoicing = {invoice.read, invoice.create, invoice.approve}`). |
| **Role** | A named, assignable set of Permissions/Groups (`Sales Manager`, `Marketing Executive`). System or custom. |
| **Scope** | The *where* of an assignment — a conjunction of dimension constraints (see 6.3). |
| **Grant / Assignment** | `Principal ← Role @ Scope [+ time bounds]`. The concrete thing an owner creates. |
| **Policy** | A conditional rule (ABAC) resolving ALLOW/DENY from attributes; may target Resource/Action/Field with conditions. |
| **Effect** | `ALLOW` or `DENY` carried by a grant/policy. DENY wins. |
| **Capability** | Abstract business function a Permission may authorize instead of a raw resource (keeps grants stable as modules change). |

---

## 6. Architecture

### 6.1 Layered model — RBAC core, ABAC overlay

```
        ┌─────────────────────────────────────────────────────┐
        │                      POLICY (ABAC)                   │  ← conditions & explicit deny
        │   effect + conditions over {principal, record, env}  │
        ├─────────────────────────────────────────────────────┤
        │                       SCOPE                          │  ← WHERE a role applies
        │  Org·Workspace·Entity·Location·Dept·Team·Project·     │
        │  Module·Capability·Resource·Record·Field             │
        ├─────────────────────────────────────────────────────┤
        │                        ROLE                          │  ← WHAT (bundle of permissions)
        │            Permissions / Permission Groups           │
        ├─────────────────────────────────────────────────────┤
        │                     PERMISSION                       │  ← atomic resource.action
        │              resource.action (module-declared)       │
        └─────────────────────────────────────────────────────┘
                 A grant = Role  ×  Scope  (+ time)  attached to a Principal
                 Policies refine/deny on top.  Default = DENY.
```

RBAC gives coarse, legible structure (Roles you can name and audit). ABAC gives precision (conditions,
ownership, thresholds, explicit carve-outs) without exploding the number of Roles. Neither alone is
enough — enterprise access needs both.

### 6.2 Permission — atomic and module-declared

```
Permission := <resource>.<action>
  invoice.read        customer.read      patient.read      machine.maintain
  invoice.create      customer.manage    appointment.read  production.create
  invoice.approve     employee.manage    student.read      inventory.adjust
```

- **Registered by Modules** (R2). The Sales module declares `invoice.*`, `customer.*`; a future Hospital
  module declares `patient.*`, `appointment.*` — **IAM changes nothing**. IAM stores the permission key
  and authorizes it; it never "knows" what an invoice or a patient is.
- May authorize a **Capability** (`sales.read`) instead of a raw resource, so grants survive a module
  swap that still provides `sales`.
- Actions are an **open, module-declared** vocabulary; common verbs are conventions, not a fixed enum.

### 6.3 Scope — the where, across every dimension (R4)

A Scope is a **conjunction** (AND) of per-dimension constraints; an omitted dimension means "unconstrained
on that axis" (subject to default-deny elsewhere):

```
Scope {
  organization : COSMY            (always present — isolation)
  workspace    : Production
  entity       : Salam Cola        (or set of Entities)
  location      under: Pune        (node ref; inherits to descendants)
  department   : Marketing
  team         : —                 (unconstrained)
  project      : —
  module       : {Sales, CRM, Marketing}
  capability   : —
  resource     : {Customer, Lead, Campaign}
  record       : —                 (all instances matching the above)
  field        : —                 (all fields; or e.g. exclude {salary})
}
```

- **Dimension inheritance** follows the Organization Model: a `location under: Pune` covers Pune's
  subtree; `entity: Salam Cola` covers its nodes. (Cross-dimension combination = intersection; evaluated by
  the engine.)
- **Record** and **Field** dimensions enable instance-level and column-level control (R9): e.g.
  `record: owner == principal`, or `field: exclude {salary, bankAccount}`.
- The client scenario is exactly one grant: `Role=Marketing Executive @ Scope{entity: Salam Cola,
  location under: Pune, department: Marketing, module:{Sales,CRM,Marketing}, resource:{Customer,Lead,
  Campaign}}`.

### 6.4 Role — named bundle, multi-assignable (R3)

```
Role "Marketing Executive"
  ├── Permission Group "CRM Basic"  = {customer.read, lead.read, lead.create, lead.update}
  ├── Permission Group "Campaigns"  = {campaign.read, campaign.create}
  └── Permission        customer.export        (single)

System Roles: Owner, Admin, Manager, Member, Viewer  (seeded, non-deletable, editable-with-care)
Custom Roles: created by the Owner/Admin per Organization
```

- A Principal holds **many** Roles, each with **its own Scope** (R3/R5). Roles are **additive** for
  allows; DENY (policy or deny-grant) overrides (R6).
- Roles are **scope-agnostic definitions**; the same "Manager" Role is reused at different Scopes for
  different managers. This keeps the Role catalog small and legible.

### 6.5 Policy — ABAC conditions & explicit deny (R6/R7)

```
Policy {
  effect     : ALLOW | DENY
  target     : resource / action / field   (what it speaks to)
  condition  : boolean over attributes of {principal, record, scope, environment}
  scope      : where the policy applies (same dimensions as a Scope)
}

Examples
  ALLOW invoice.read   WHERE record.location under principal.scope.location
  DENY  invoice.export WHERE record.amount > 1_000_000 AND principal.authLevel < mfa
  DENY  employee.read.field(salary) WHERE principal.department != HR
  ALLOW record.*       WHERE record.owner == principal        (ownership)
```

- Policies express what Roles can't: ownership, thresholds, record **state** (`invoice.status == DRAFT`),
  time windows, and **field-level** redaction.
- **Explicit DENY** enables carve-outs ("all Finance except Payroll") and hard prohibitions that no role
  accumulation can override (R6).

### 6.6 Composition — how a decision's *inputs* are assembled

```
Principal ── holds ──► [ Grant₁: RoleA @ ScopeA (t) ]
                       [ Grant₂: RoleB @ ScopeB     ]
                       [ Deny-Grant: RoleX @ ScopeX ]
Organization ── defines ──► [ Policy₁ ALLOW … ] [ Policy₂ DENY … ]

For a request (principal, action, record):
   candidate allows = grants whose Role contains the Permission AND whose Scope matches record stamp
   candidate denies = deny-grants/policies that match
   → handed to the Permission Engine for resolution (deny-overrides, default-deny)
```

This document defines these **inputs**; `OCTIEN_PERMISSION_ENGINE.md` defines the **algorithm** that turns
them into a single ALLOW/DENY.

### 6.7 The IAM-knows-nothing-about-modules invariant (R2/R12)

```
IAM UNDERSTANDS (generic)                 MODULES/DATA SUPPLY (specific)
─────────────────────────                 ──────────────────────────────
resource (opaque key)                     "invoice", "patient", "machine"
action (opaque verb)                      "approve", "admit", "maintain"
scope dimension values (node refs)        Salam Cola, Pune, Marketing
Role / Group / Policy structures          "Sales Manager", "Charge Nurse"
```

A Hospital Solution Pack ships a Clinical module that registers `patient.read`, `appointment.manage`;
the Owner builds a "Charge Nurse" Role over them and scopes it to *Ward 3*. **No IAM code changes.** That
is the whole point of the separation.

---

## 7. Relationships

```
Module        1───* Resource        Resource 1───* Action  ⇒ Permission (resource.action)
Permission    *───* Permission Group
Permission/Group *───* Role
Principal     1───* Grant           Grant *───1 Role   Grant 1───1 Scope   Grant 0..1 TimeBound
Organization  1───* Policy          Policy 1───1 Scope  Policy 1───1 Effect
Scope         *───* Node            (Entity/Location/Department/Team/Project — from Organization Model)
Grant/Policy  1───1 Effect (ALLOW|DENY)
```

---

## 8. Owner powers (R11) — expressed in this model

The Organization **Owner** (root authority) can, via these primitives:

| Owner action | Expressed as |
|---|---|
| create/deactivate users | Identity lifecycle (Invited/Active/Suspended/Offboarded) |
| assign roles | create Grants (Role × Scope) |
| create custom roles | define Roles from Permissions/Groups |
| grant / revoke permissions | edit Role contents or add/remove Grants |
| assign entities / geography / departments / teams / projects | set Scope dimensions on Grants |
| assign modules | Module dimension in Scope (+ Feature Flags at tenant config) |
| restrict resources / actions | Resource dimension + which Permissions the Role carries |
| restrict records / fields | Record/Field dimensions + ABAC Policies |
| temporarily suspend access | Identity `Suspended` **or** time-bound/suspend a Grant |
| review effective access | Effective Access model (separate doc) |
| audit permission changes | every Grant/Role/Policy change emits an Audit Event |
| delegate administration | grant an admin Role scoped to IAM resources, **minus** sensitive ones (e.g. deny `permission.finance.*`) |

Delegated administration is itself just Roles+Scopes+Deny: "User Admin can manage users and roles but is
**denied** granting Finance permissions" = an admin Role with an explicit DENY policy on financial
permission targets.

---

## 9. Examples

1. **Marketing employee (the canonical case).** One Grant:
   `Marketing Executive @ {Salam Cola, under Pune, Marketing, modules {Sales,CRM,Marketing}, resources
   {Customer,Lead,Campaign}}`. Everything else (Finance, HR, other cities, other entities) is default-deny.
2. **Regional manager.** `Manager @ {Salam Cola, under Maharashtra, all departments}` → inherits to Pune &
   Nagpur; broader than the employee by Scope, same Role catalog.
3. **Finance-except-Payroll.** `Finance Manager` role + Policy `DENY payroll.* @ {Finance dept}` → all
   Finance access minus Payroll, no matter what the role bundles.
4. **Ownership policy.** `ALLOW lead.update WHERE record.owner == principal` lets reps edit only their own
   leads, without a per-record grant.
5. **Field redaction.** `DENY customer.read.field(creditLimit) WHERE principal.role != FinanceManager` →
   sensitive column hidden even where the row is readable.
6. **AI tool.** The Sales AI's `list_overdue_invoices` tool authorizes `invoice.read`; it is evaluated
   against the acting user's grants/scopes — identical inputs, identical model (R10).

---

## 10. Security boundaries

- **Default deny** is the ground state; access exists only where a matching ALLOW is present (R8).
- **Deny overrides allow** — no accumulation of Roles can defeat an explicit DENY (R6).
- **Scope is mandatory** — a grant with no Scope is not "global"; Organization is always constrained and
  unspecified dimensions never silently widen beyond default-deny elsewhere.
- **Modules cannot self-authorize** — registering a Resource/Action creates an *authorizable* permission,
  not a *granted* one; the Owner must grant it.
- **Field/record control is first-class**, so sensitive data can be protected without hiding whole
  resources.
- **One model, all surfaces** — UI, API, and AI consume the same grants; there is no "API bypass" path.
- **No industry leakage** — access primitives are generic; specificity lives only in Scope *values*.

---

## 11. Edge cases (grant-shape level)

| # | Case | Handling in this model |
|---|---|---|
| 1 | User has **two Roles**, one allows, one silent | Additive allow → allowed (unless a DENY matches) |
| 2 | User has a Role that allows **and** a Policy that denies | DENY wins (R6) |
| 3 | **Multi-entity** employee | Multiple Grants, one per Entity Scope; unioned, each bounded |
| 4 | **Broader manager, narrower employee** | Independent Grants at different Scopes; no interaction unless same records |
| 5 | **Temporary access** | Time-bound Grant; expiry handled by engine (auto-DENY after `end`) |
| 6 | **Resource deprecated** | Permission remains authorizable but module marks it `Deprecated` (Lifecycle); grants inert once archived |
| 7 | **Record belongs to another Entity** | Scope's Entity dimension won't match its stamp → default deny |
| 8 | **Field-level** sensitive data | Field dimension / redaction Policy |
| 9 | **Delegated admin** must not touch Finance perms | Admin Role + explicit DENY on financial permission targets |
| 10 | **Break-glass** emergency access | A special, loudly-audited, time-boxed Grant (policy-gated) — see Engine/Effective Access |

The full 23-case operational catalogue (with resolution outcomes) is in
`OCTIEN_EFFECTIVE_ACCESS_MODEL.md`.

---

## 12. Verification criteria

- [ ] A single grant can express `Entity × Location(subtree) × Department × Module × Resource` — the
      client scenario — with everything else denied.
- [ ] A Principal can hold multiple Roles at different Scopes simultaneously.
- [ ] An explicit DENY defeats any combination of allows.
- [ ] A new Module can add Resources/Actions and have them become grantable **without IAM changes**.
- [ ] Field- and record-level restrictions are expressible.
- [ ] Every access primitive is generic; no `Salam Cola`/`hospital`/`invoice` literal appears in the IAM
      model itself (only as Scope *values* / module-registered keys).
- [ ] The same grant model is the sole authority for UI, API, and AI.

---

## 13. Open decisions

1. **Capability-first vs resource-first permissions:** do we grant `sales.read` (capability) or
   `invoice.read` (resource) by default? (Leaning: allow both; prefer capability for portability.)
2. **Scope representation:** one flexible Scope object per grant vs normalized per-dimension rows
   (queryability vs flexibility) — pinned in the Engine doc.
3. **Policy language:** a constrained condition DSL vs a fixed set of parameterized policy templates
   (safety/auditability vs expressiveness).
4. **Deny granularity:** deny-grants (Role×Scope with DENY effect) vs deny-only Policies — do we need both?
5. **Role inheritance:** do Roles compose other Roles (hierarchy), or only Permission Groups? (Leaning:
   Groups only, to avoid deep role graphs.)
6. **Field-level catalog:** which Resources declare protectable fields, and who registers them (module vs
   Owner)?

---

**This document defines the shape of access. It does not decide any request.** The algorithm that turns
these grants and policies into a single ALLOW/DENY — conflict resolution, inheritance, temporary/break-
glass, the AI gate, and enforcement points — is `OCTIEN_PERMISSION_ENGINE.md`.
