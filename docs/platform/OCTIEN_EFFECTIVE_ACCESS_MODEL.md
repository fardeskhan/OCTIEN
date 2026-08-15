# OCTIEN Effective Access Model — Explaining Every Decision

**Status:** DESIGN / ARCHITECTURE ONLY — no code, no Prisma, no UI.
**Companions:** `OCTIEN_PLATFORM_CORE.md`, `OCTIEN_DOMAIN_MODEL.md` (binding vocabulary),
`OCTIEN_IDENTITY_ARCHITECTURE.md`, `OCTIEN_ORGANIZATION_MODEL.md`, `OCTIEN_ACCESS_CONTROL_MODEL.md`,
`OCTIEN_PERMISSION_ENGINE.md`.
**Depends on:** CAP-SHELL V1.0 (frozen).

> The Permission Engine makes decisions. This document makes them **legible**. **Effective Access** is
> the fully-resolved answer to *"what can this principal actually do, and why?"* — computed from Identity
> + Organization + Grants + Policies. It powers the owner's two essential questions:
> **"Why can this employee access this record?"** and **"Why can this employee NOT access this record?"**
> It is also where the **23 critical edge cases** are reasoned through end-to-end.

---

## 1. Purpose

- Define **Effective Access** — the resolved, explainable projection of a principal's authority.
- Provide the **explanation / trace** model so any ALLOW or DENY can be justified in plain terms.
- Define the **owner/admin visibility** surface: view a user's effective access, simulate access, review
  and audit changes.
- Reason explicitly through the **23 critical edge cases** with concrete resolutions.
- Establish **delegated administration** boundaries and audit expectations.

This document is *derived* — it introduces no new grant primitive. It reads the same inputs the engine
does and presents them for humans (and for governance).

---

## 2. Current-state audit

| Capability | Today | Gap |
|---|---|---|
| "What can this user do?" | Inspect their single `Membership` + role's permissions manually | No resolved view; no scope (there is none) |
| "Why allowed/denied?" | Not answerable — no engine, no trace | **Missing entirely** |
| Simulate access | none | **Missing** |
| Access review / recertification | none | **Missing** (enterprise/compliance need) |
| Change audit | `AuditLog`/`AuditEvent` tables exist | Not fed by IAM changes; no permission-change trail |
| Delegated admin | none | **Missing** |

**Net:** today you can read a role's permission list, but you **cannot** resolve *effective* access
(there are no scopes), **cannot** explain a decision, and **cannot** review or simulate. This layer
supplies all four.

---

## 3. Problems

1. **Opacity.** Without a resolved, explained view, owners can't trust or verify access — the top
   enterprise objection.
2. **No simulation.** "If I give her this role at Pune, what changes?" is unanswerable before committing.
3. **No recertification.** Auditors require periodic "who has access to what, and is it still needed?".
4. **No change trail.** Grant/role/policy edits must be attributable and reversible-by-record.
5. **Delegation risk.** Owners must delegate admin **without** handing over sensitive powers (e.g.
   financial permissions) — needs explicit boundaries and visibility.

---

## 4. Requirements

- **R1** Compute **Effective Access** for any principal: the resolved union of allows minus denies, across
  all dimensions, with time and lifecycle applied.
- **R2** For any `(principal, action, target)`, produce a **decision explanation** (trace) naming the
  grant/policy/structure rule that decided it — for both ALLOW and DENY.
- **R3** **Admin visibility**: an authorized admin can view a user's effective access (by module, entity,
  location, resource) and drill into *why*.
- **R4** **Simulation ("what-if")**: preview effective access for a hypothetical grant/role/scope change
  before applying it.
- **R5** **Access review / recertification**: enumerate principals ↔ access for a scope, for periodic
  attestation.
- **R6** **Change audit**: every IAM mutation (grant/revoke/role/policy/scope/lifecycle) emits an
  immutable, attributable Audit Event; effective access at a past time is reconstructable.
- **R7** **Delegated administration** is expressible and bounded (admin manages users/roles but is denied
  named sensitive powers), and its own limits are visible.
- **R8** Explanations are **truthful and generic** — they cite grants/scopes/policies/nodes, never
  invented reasons, never industry-specific logic.
- **R9** Effective Access is **read-derived** — it never becomes a second grant store to drift from the
  engine; it always reflects current authority (or an explicitly chosen historical point).

---

## 5. Terminology (this document)

| Term | Definition |
|---|---|
| **Effective Access** | The resolved set of `{resource.action @ where}` a principal may perform *now* (or at a chosen time), after inheritance, combination, deny-precedence, time, and lifecycle. |
| **Decision Explanation (trace)** | The ordered reason a specific request resolved ALLOW/DENY: which gate/grant/policy was decisive. |
| **Access Path** | The chain that produces an allow: `Principal → Grant → Role → Permission` + `Scope → Node(s) → Record stamp`. |
| **Deny Reason** | The specific cause of a DENY: default-deny (no path), explicit-deny (grant/policy), structural (node disabled), identity/isolation, condition-unmet, expired. |
| **Simulation** | A pure recomputation of Effective Access under hypothetical inputs, with **no** persistence. |
| **Recertification** | A periodic attestation that listed access is still warranted. |
| **Delegated Admin** | A principal granted IAM-management permissions within bounds (with named denies). |

---

## 6. Architecture

### 6.1 Effective Access is a projection, not a store (R9)

```
   Identity (principal, state, session)
   Organization (node tree, lifecycle)          ┐
   Access Control (grants, roles, policies)      ├─► resolve()  ─► Effective Access (derived view)
   Time / context                                ┘                      │
                                                                        └─► rendered for admins,
                                                                            fed to recertification,
                                                                            explained per decision
```

`resolve()` uses the **same** rules as the engine's `decide()` (§Permission Engine 6.1–6.3), but produces
a **panorama** (everything the principal can do) rather than one verdict. It is always recomputed from
source — never a cache that can silently diverge (R9). A chosen `asOf` time reconstructs a historical view
from the audit trail (R6).

### 6.2 The two owner questions

**"Why CAN this employee access this record?"** → walk the winning **Access Path**:

```
ALLOW  invoice #10291 . read
  because  Grant#G7  (Role "Marketing Executive")
           carries   Permission  invoice.read      ✔
           Scope     {entity: Salam Cola,           matches stamp entity ✔
                      location under: Pune,          record path IN/MH/PN/PN-1 ✔ (inherited)
                      department: Marketing}         matches stamp dept ✔
           time      within [—, —] (no bound)        ✔
           no matching DENY / all conditions hold    ✔
```

**"Why can this employee NOT access this record?"** → name the **decisive** deny reason:

```
DENY  invoice #55012 . read
  reason  DEFAULT-DENY: no grant's Scope matches this record
          closest grant  G7 covers location under "Pune";
                         record is under "Nagpur" (IN/MH/NG) → not inherited
          suggestion (admin-facing): extend G7 location to "Maharashtra", or add a Nagpur grant
```

Explanations are **actionable** and **truthful** — they cite the exact grant/scope/rule, and (for denies)
the nearest near-miss so the owner knows what to change (R2/R8).

### 6.3 Effective Access panorama (admin view shape)

```
Principal: Aisha (Marketing Executive)   Org: COSMY   Workspace: Production
──────────────────────────────────────────────────────────────────────────
By Entity        Salam Cola ✔     COSMY UCO ✖     Casa de Lumas ✖
By Location       under Pune ✔    (Nagpur ✖, other states ✖)
By Department     Marketing ✔     (Finance ✖ HR ✖ Sales-ops ✖)
By Module         Sales ✔  CRM ✔  Marketing ✔     (Finance ✖ HR ✖ Inventory ✖)
By Resource       Customer r/w · Lead r/w/create · Campaign r/create
                  Invoice ✖  Payroll ✖
Field notes       Customer.creditLimit  → hidden (DENY policy P3)
Time-bounded      none
Break-glass       not active
```

Every ✔/✖ is drill-through to its Access Path or Deny Reason (R3). This *is* the owner's "see exactly what
a user can access".

### 6.4 Simulation / what-if (R4)

```
simulate( base = current grants, change = "add Grant: Manager @ under Maharashtra" )
  → Effective Access(before)  vs  Effective Access(after)   [diff]
      + Nagpur leads now readable
      + Finance module now visible in MH
      − (nothing removed)
  → NOTHING PERSISTED unless admin confirms
```

Simulation is pure `resolve()` over hypothetical inputs — the owner sees the blast radius **before**
granting. Same machinery answers "what breaks if I disable this Entity?" (R4).

### 6.5 Delegated administration (R7)

```
Role "User Admin"  = { user.manage, role.read, role.assign, grant.create, grant.revoke }
  @ Scope { organization: COSMY }
  + Policy DENY  grant.create WHERE target.permission IN financialPermissions   (named carve-out)
  + Policy DENY  role.edit    WHERE target.role.isSystem

Result: User Admin can onboard users and assign non-financial roles,
        but CANNOT grant Finance/Payroll permissions or edit system roles.
        Their own limits are themselves visible via Effective Access.
```

Delegation is *just* Access-Control primitives (Role + Scope + explicit DENY) resolved and shown by this
layer. The owner can **see** and **audit** what each delegated admin may do — including what they're denied
(R3/R7).

### 6.6 Change audit & historical reconstruction (R6)

```
Every IAM mutation → Audit Event { actor, action, target, before, after, reason, at }
  grant.created · grant.revoked · role.edited · policy.changed · scope.narrowed ·
  node.suspended · user.suspended · break-glass.activated · impersonation.started/stopped

resolve(principal, asOf = 2026-06-01)  → replays events ≤ asOf → historical Effective Access
```

This answers "what could she access in June?" and "who granted Finance access, when, and why?" — the
recertification and forensic backbone (R5/R6).

---

## 7. The 23 critical edge cases — reasoned resolutions

Notation: outcome is what the **engine** returns; the **why** is the Effective-Access explanation.

| # | Case | Resolution (outcome — why) |
|---|---|---|
| 1 | Employee belongs to **multiple entities** | ALLOW within each — union of per-Entity grants; each bounded by its own Scope; no cross-Entity bleed. Panorama shows ✔ per entity. |
| 2 | Employee works in **multiple cities** | ALLOW in each city — grants at each City node (or a shared ancestor via inheritance). Records outside → default-deny. |
| 3 | Employee has **two roles** | Additive allows; a matching DENY (policy/deny-grant) still wins. Trace names the role that allowed. |
| 4 | One role **allows**, another **denies** | **DENY** — deny-overrides-allow (Engine rule 3). Explanation cites the deny. |
| 5 | Manager has **broader geographic access** than employee | Independent grants; manager's `under Maharashtra` inherits to more cities. No interaction unless same records; each explained by own path. |
| 6 | **Temporary access expires** | Before `start` / after `end` → grant treated absent → **DENY (expired)**. Panorama drops it automatically; audit retains the history. |
| 7 | Employee **changes department** | Re-scope grants (revoke old dept grant, add new). Effective Access flips accordingly; change audited. Old-dept records → default-deny. |
| 8 | Employee **leaves organization** | Offboarded → grants revoked → Effective Access empties; historical Records still resolve their name via retained inactive Principal (Identity §6.6). |
| 9 | **Entity disabled** | Structural DENY for whole subtree (Engine rule 2), even with descendant grants. Reason: "node Suspended/Archived". Reversible. |
| 10 | **Location disabled** | Same structural cascade for that Location's subtree + its Records. |
| 11 | **Module disabled** (feature flag / lifecycle) | Its Resources become non-authorizable in that scope → **DENY (module off)**; grants inert while disabled, restored when re-enabled. |
| 12 | **Resource deprecated** | Still authorizable until Archived; panorama flags "Deprecated"; once Archived, grants over it go inert → default-deny. |
| 13 | **Record belongs to a different entity** | Scope Entity dimension ≠ record stamp → no allow matches → **DENY (default)**. Near-miss explanation names the entity mismatch. |
| 14 | **Record moves between locations** | Explicit audited re-stamp → re-evaluated from new coordinates; may flip ALLOW↔DENY. Both states explainable via `asOf`. |
| 15 | User tries **direct URL access** | Same `decide()` point-check; not in scope filter → **DENY**. UI hiding is irrelevant; boundary is the data layer. |
| 16 | User **calls API directly** | Identical — API routes call the one gate; `scopeFilter` bounds any query → **no bypass**. |
| 17 | **AI attempts an unauthorized action** | AIeffective ⊆ subjecteffective → **DENY**; trace: "capped by subject; subject lacks `x.y`". |
| 18 | **Owner delegates administration** to another admin | Delegated Role + Scope; owner sees/audits the delegate's effective (and denied) powers. |
| 19 | Admin should manage **users but not financial permissions** | Admin Role + **DENY** on financial permission targets (§6.5) → can onboard, cannot grant Finance. Explained + audited. |
| 20 | **Cross-entity reporting** | Requires a reporting Role whose Scope spans multiple Entities; absent that → default-deny. Panorama shows the reporting grant explicitly. |
| 21 | **Cross-region reporting** | Grant at a common ancestor Location (e.g. Country) inherits across regions; otherwise per-region grants unioned. |
| 22 | **Field-level sensitive data** | Field dimension / redaction Policy → row readable, `field(salary)` **DENY**; explanation cites the field policy. |
| 23 | **Emergency / break-glass access** | Explicit, time-boxed, audited elevation; overcomes absence-of-grant (and suspension where its policy allows) but **never** an explicit DENY; every access flagged; auto-expires (Engine §6.7). |

Every row is resolved by the **same** engine rules — this table is explanation, not new logic.

---

## 8. Relationships

```
resolve() reads → Identity · Organization tree · Grants/Roles/Policies (Access Control)
resolve() yields → Effective Access panorama · Decision Explanations · Simulation diffs
IAM mutations   → Audit Events → historical resolve(asOf) · recertification reports
Delegated Admin → Access-Control primitives, surfaced + bounded here
```

---

## 9. Security boundaries

- **Derived, never authoritative** — Effective Access can't grant anything; it only reflects the engine
  (R9). No drift, no shadow permission store.
- **Explanations don't leak** — an admin sees explanations only within their **own** delegated visibility
  scope; "why denied" never reveals data the viewer can't see (only structure/grant facts).
- **Simulation is inert** — what-if persists nothing until explicitly applied (R4).
- **Change trail is immutable & attributable** — every mutation audited; history reconstructable (R6).
- **Delegation is bounded and visible** — delegated admins operate within named denies they cannot lift
  (R7).
- **Generic explanations** — reasons cite grants/scopes/nodes/policies, never industry logic (R8).

---

## 10. Edge cases (explanation-layer)

| # | Case | Handling |
|---|---|---|
| 1 | Two independent paths both allow | Trace reports the first decisive allow; panorama can list all contributing paths |
| 2 | Allow path exists but a deny wins | Explanation surfaces the **deny** as decisive, and notes the shadowed allow (for clarity) |
| 3 | Historical `asOf` predates a node's creation | Report "node did not exist"; no fabricated access |
| 4 | Admin's visibility narrower than subject's access | Show only within admin's scope; mark "further access exists outside your visibility" |
| 5 | Simulation of removing a grant used by many | Diff lists all lost access; warn on blast radius before apply |
| 6 | Break-glass in effect during a review | Flagged distinctly; excluded from "standing" access in recertification |

---

## 11. Verification criteria

- [ ] For any principal, the platform renders a resolved Effective Access panorama by entity, location,
      department, module, resource, and field.
- [ ] Any ALLOW and any DENY can be explained with the exact deciding grant/policy/structure rule.
- [ ] "Why can/can't X access record R?" is answerable in the UI for owners/admins.
- [ ] Simulation previews a change's effect and persists nothing until confirmed.
- [ ] Recertification can enumerate principals ↔ access for a scope, at a chosen time.
- [ ] Every IAM change is audited and historical effective access is reconstructable.
- [ ] Delegated admins' powers **and** their denied powers are both visible.
- [ ] All explanations are generic (no industry/entity logic baked into the explainer).

---

## 12. Open decisions

1. **Explanation depth in UI:** show the single decisive rule, or the full contributing set by default?
   (Clarity vs completeness.)
2. **Recertification cadence & ownership:** who attests (owner vs entity/department managers), how often,
   and what happens to un-attested access (auto-suspend?).
3. **Historical fidelity:** reconstruct `asOf` purely from the audit event stream, or periodic effective-
   access snapshots for speed?
4. **Near-miss suggestions:** how prescriptive should "why denied" be (mere fact vs "grant X to fix")?
   Risk of nudging over-permissioning.
5. **Visibility scoping of explanations:** exact rule for what a delegated admin may see about principals
   outside their scope.
6. **Recertification/attestation as records:** modeled as Workflow + Tasks (platform services) or a
   dedicated governance module?

---

## 13. Summary of the five-document architecture

```
WHO      OCTIEN_IDENTITY_ARCHITECTURE   → Principal (User/AI/Service), Org, Workspace, Session, lifecycle
WHERE    OCTIEN_ORGANIZATION_MODEL      → Org→Workspace→Entity→Location→Dept→Team→Project, geo tree, stamps
WHAT     OCTIEN_ACCESS_CONTROL_MODEL    → Permission, Role, Scope, Policy (RBAC + ABAC), grants, owner powers
HOW      OCTIEN_PERMISSION_ENGINE       → decide()/scopeFilter(), precedence, enforcement, AI gate
WHY      OCTIEN_EFFECTIVE_ACCESS_MODEL  → resolve(), explanations, simulation, recertification, the 23 cases
```

**Invariant across all five:** the platform understands `Organization · Entity · Location · Department ·
Team · Project · Module · Resource · Action · Record · Field` — and never `Salam Cola · UCO · COSMY ·
Hospital · School · Factory`. Those are **data**. That single discipline is what lets OCTIEN be *one
platform → many organizations → many industries → configurable applications*.

---

**This completes the Identity, Organization & Access Control architecture set. Architecture only — no
implementation.**
