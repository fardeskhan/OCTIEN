# OCTIEN Permission Engine — How a Decision Is Made

**Status:** DESIGN / ARCHITECTURE ONLY — no code, no Prisma, no middleware, no UI.
**Companions:** `OCTIEN_PLATFORM_CORE.md`, `OCTIEN_DOMAIN_MODEL.md` (binding vocabulary),
`OCTIEN_IDENTITY_ARCHITECTURE.md`, `OCTIEN_ORGANIZATION_MODEL.md`, `OCTIEN_ACCESS_CONTROL_MODEL.md`,
`OCTIEN_EFFECTIVE_ACCESS_MODEL.md`.
**Depends on:** CAP-SHELL V1.0 (frozen).

> The Access Control model defines the **inputs** (Permissions, Roles, Scopes, Policies, Grants). This
> document defines the **algorithm**: given a Principal, an Action on a Resource/Record, in a Session, how
> the engine returns a single **ALLOW/DENY** with a reason. **One gate for UI, API, and AI.** Default
> deny. Deny overrides allow.

---

## 1. Purpose

- Specify the **decision function** `decide(principal, action, target, context) → {ALLOW|DENY, reason}`.
- Nail down **conflict resolution**: default-deny, explicit-allow, explicit-deny, deny-precedence,
  inheritance, scope narrowing, role combination, temporary access, break-glass.
- Define the **enforcement points** (UI, API/route, data query, AI tool) so there is **no bypass**.
- Define the **AI authorization gate** (AI ≤ acting user, always).
- Define **data-scoping** (turning a decision into a *filtered query*, not just a yes/no).

This is the single most security-critical component in OCTIEN. It must be **deterministic, explainable,
and fail-closed**.

---

## 2. Current-state audit

| Aspect | Today | Gap |
|---|---|---|
| Decision function | none — no central evaluator | Access is effectively "has a Membership on this Business" |
| Conflict resolution | n/a | No allow/deny precedence exists |
| Scope matching | n/a | No scopes to match |
| Enforcement points | route/page auth via Better Auth session; per-feature ad-hoc checks | **No uniform gate**; risk of inconsistent/bypassable checks |
| Data scoping | manual `where businessId = …` in queries | Correct-by-convention, not enforced; easy to forget → leak |
| AI gate | none | AI could act unbounded if wired naively |
| Auditing decisions | `AuditLog`/`AuditEvent` tables exist | Not fed by an engine; no decision trail |

**Net:** there is **no engine** — only session presence + hand-written `businessId` filters. Correctness
depends on every developer remembering to filter. The platform needs **one evaluator** that both answers
yes/no *and* produces the data filter.

---

## 3. Problems

1. **No single source of truth for decisions** → inconsistent checks, some forgotten (silent data leaks).
2. **No precedence rules** → cannot reason about allow vs deny, inheritance, or role combination.
3. **Yes/no is not enough** → list endpoints need a **filter** ("which records"), not a boolean per row
   after the fact.
4. **AI could bypass** the human's boundary if it calls services directly.
5. **API/URL access** may skip UI checks → must be gated at the data boundary, not the view.
6. **No decision audit** → can't answer "why was this allowed/denied?" (the Effective Access promise).

---

## 4. Requirements

- **R1** A **single** `decide()` function is the *only* authority; UI/API/AI all call it.
- **R2** **Default deny**: no matching ALLOW ⇒ DENY.
- **R3** **Deny overrides allow**: any matching explicit DENY ⇒ DENY, regardless of allows.
- **R4** **Inheritance**: scope grants at ancestor nodes cover descendants (per Organization Model), per
  dimension, combined by **intersection across dimensions**.
- **R5** **Scope narrowing** only: combining grants can widen the *set of allows* but never escape an
  applicable DENY or the Organization/Workspace isolation.
- **R6** **Role combination** is additive for allows; deny-precedence still applies.
- **R7** **Temporary access**: time-bounded grants auto-expire (DENY after `end`, not-yet-valid before
  `start`).
- **R8** **Break-glass**: an explicit, policy-gated, loudly-audited, time-boxed elevation path — never
  silent, never default.
- **R9** **Two decision modes**: *point* (`can principal do action on this record?`) and *set* (`give me
  the filter selecting all records principal may act on`).
- **R10** **Enforcement at the data boundary** (query filter) so API/URL access can't bypass UI checks.
- **R11** **AI gate**: an AI Tool call is evaluated as the **subject** principal; `AIeffective ⊆
  subjecteffective`. No AI-only elevation except an explicit, lower-or-equal service policy.
- **R12** **Every decision is explainable and audited** (feeds `OCTIEN_EFFECTIVE_ACCESS_MODEL.md`).
- **R13** **Deterministic & fail-closed**: same inputs ⇒ same output; any error/uncertainty ⇒ DENY.
- **R14** The engine references only **generic** concepts (resource keys, actions, node refs); it embeds
  no module or industry logic.

---

## 5. Terminology (this document)

| Term | Definition |
|---|---|
| **Decision request** | `{principal, action, target, context}` submitted to the engine. |
| **Target** | The thing acted upon: a Resource (type-level, e.g. "create invoice") or a Record (instance, carrying a hierarchy stamp). |
| **Context** | Session-derived facts: Organization, Workspace, authLevel, time, break-glass flag. |
| **Candidate allow / deny** | A grant/policy that *matches* the request (permission present, scope matches, conditions hold). |
| **Point decision** | ALLOW/DENY for one target. |
| **Set decision (scope filter)** | A predicate over record coordinates selecting the permitted subset (for lists/queries). |
| **Effective access** | The fully-resolved set of what a principal may do, for explanation (next doc). |
| **Break-glass** | Emergency elevation: explicit, time-boxed, audited, reversible. |

---

## 6. Architecture

### 6.1 The decision pipeline

```
decide(principal, action, target, context):

 0. IDENTITY GATE (fail-closed, before anything)
    session valid? principal Active? Workspace valid? org matches target.org?
        └─ no → DENY "identity/isolation"          (Identity Architecture §6.3, §9)

 1. STRUCTURAL GATE (deny-by-structure)
    is target's node subtree Suspended/Archived (Entity/Location/Dept/…)?
        └─ yes (and not break-glass) → DENY "node disabled"   (Organization Model §6.5)

 2. GATHER candidates
    permission key = action.resource (or capability.action)
    candidate_allows = grants where Role⊇permission AND Scope matches target stamp AND time-valid
    candidate_denies = deny-grants + Policies(effect=DENY) that match target
    applicable_policies = ABAC policies (ALLOW/DENY) whose conditions evaluate over {principal,target,ctx}

 3. RESOLVE (precedence)
    if any candidate_deny or DENY policy matches            → DENY  "explicit deny"      (R3)
    else if no candidate_allow and no ALLOW policy grants   → DENY  "default deny"        (R2)
    else                                                    → ALLOW "granted by <trace>"  (R6)

 4. CONDITION CHECK (ABAC refine)
    evaluate ALLOW-policy conditions (ownership, thresholds, record state, step-up authLevel)
        └─ condition fails → DENY "condition unmet"                                        (R7-style)

 5. EMIT decision + reason trace  → audit (R12); fail-closed on any error → DENY (R13)
```

Order matters: **identity/isolation and structural denies come first** (cheap, absolute), then explicit
deny, then default-deny, then allows refined by conditions. **Deny always precedes allow.**

### 6.2 Precedence table (the heart of conflict resolution)

Evaluated top-to-bottom; **first decisive rule wins**:

| Priority | Rule | Result |
|---|---|---|
| 1 | Identity invalid / cross-Organization / cross-Workspace | **DENY** (isolation) |
| 2 | Target node (or ancestor) Suspended/Archived, no break-glass | **DENY** (structure) |
| 3 | Any matching **explicit DENY** (deny-grant or DENY policy) | **DENY** (deny-overrides-allow) |
| 4 | Matching **ALLOW** grant/policy, time-valid, conditions hold | **ALLOW** |
| 5 | Break-glass active + within its policy + audited | **ALLOW** (elevated, flagged) |
| 6 | Otherwise | **DENY** (default deny) |

> **Deny is never overridden by an allow.** Break-glass (5) does **not** override an explicit DENY (3) —
> it only overcomes absence-of-grant (6) and, where its policy explicitly permits, structural suspension
> (2). Hard prohibitions (3) stand even in emergencies.

### 6.3 Inheritance & cross-dimension combination

```
Per dimension (Location, Entity, Department…):  grant at ancestor ⇒ covers descendants   (R4)

Across dimensions:  a Scope matches a Record only if ALL its constrained dimensions match
                    (intersection) — Entity AND Location AND Department AND …

Record stamp:  {entity:SalamCola, location:Pune-1(path IN/MH/PN/PN-1), dept:Marketing, …}
Grant scope :  {entity:SalamCola, location under Pune,               dept:Marketing}
Match?      :  entity ✔  ·  path "IN/MH/PN" is prefix of record path ✔  ·  dept ✔  → SCOPE MATCHES
```

Multiple grants are evaluated independently; a Record is allowed if **any** allow-grant's Scope matches
(union of allows) and **no** deny matches (deny-precedence). Widening beyond a grant's own subtree is
impossible (R5).

### 6.4 Set decisions — access becomes a query filter (R9/R10)

For lists/reports the engine returns a **predicate**, not a post-filter:

```
scopeFilter(principal, action, resource) →
   ( organization = ctx.org AND workspace = ctx.workspace )
   AND ( OR over allow-grants:  entity ∈ G.entities AND location.path LIKE G.locationPrefix||'%'
                                AND department ∈ G.depts AND … )
   AND NOT ( OR over deny-grants/policies: … )
   AND ( ABAC conditions: e.g. owner = principal OR status = 'DRAFT' )
```

This predicate is **pushed into the data query** (the enforcement boundary), so:
- a **list** returns only permitted rows by construction (no over-fetch-then-filter);
- a **direct API/URL** call for one record is the same predicate with `id = ?` — **URL access cannot
  bypass** view checks (R10);
- it replaces today's hand-written `where businessId = …` with an engine-generated, complete filter.

### 6.5 Enforcement points — no bypass

```
        UI (hide/disable)      ← convenience only, never the boundary
            │ calls
        API / Route  ─────────► decide() point-check on the action
            │ queries
        Data layer   ─────────► scopeFilter() pushed into every read/write   ← the real boundary
            ▲
        AI Tool  ─────────────► decide() as SUBJECT principal, then same data boundary
```

- The **data layer** is the authoritative boundary; even if a UI or API check were missed, the scope
  filter constrains what the query can touch.
- UI checks are **UX** (hide buttons) — never trusted for security.
- Every path funnels through `decide()` / `scopeFilter()` — **one gate** (R1).

### 6.6 The AI gate (R11)

```
AI Tool call (e.g. list_overdue_invoices)
   subject := the acting User principal (from the session)      (Identity §6.5)
   AIeffective := intersect( effective(subject), agentPolicy )   ⊆ effective(subject)
   → decide()/scopeFilter() run with AIeffective
```

- The AI is evaluated with the **subject's** grants, optionally **narrowed** by an agent policy — **never
  widened**. If the user can't read `invoice`, the AI can't either.
- An **unattended** AI/automation must run as an explicit **Service** principal with its **own** (never
  inherited-upward) grants; "the AI" with no subject ⇒ DENY.
- AI Tool invocations are audited as the subject acting *via* the agent (dual attribution).

### 6.7 Temporary access & break-glass (R7/R8)

- **Temporary:** a grant carries `[start,end]`; the engine treats it as absent outside the window (DENY
  before start / after end) — no cleanup job required for correctness, though expiry may be swept for
  hygiene.
- **Break-glass:** activated explicitly (a gated action, reason required), time-boxed, **loudly audited**,
  and visibly flagged on the session and every decision it enables. It overcomes *absence of grant* (and,
  where its policy says so, structural suspension) but **never** an explicit DENY (§6.2). Auto-expires.

### 6.8 Determinism, caching, and fail-closed (R13)

- Given identical `{principal state, grants, policies, target, context}`, `decide()` is **pure** →
  identical output. This is what makes decisions **explainable** and testable.
- The engine may **cache** a principal's resolved grant set per session (keyed by `scopeSetRef` from the
  Session) for speed, but **revocation invalidates** it; decisions are always against current authority,
  never a stale token.
- **Any** error, missing data, or ambiguity ⇒ **DENY** with reason `engine-error/uncertain`. There is no
  "allow on failure" path.

---

## 7. Relationships

```
decide()  consumes → Grants, Policies (Access Control) · Node tree (Organization) · Session (Identity)
decide()  produces → {ALLOW|DENY, reason-trace}  → Audit Event · Effective Access explanation
scopeFilter() produces → query predicate → pushed into Data layer (the boundary)
AI Tool   → decide() as subject → same outputs
```

---

## 8. Examples (worked resolutions)

1. **Marketing employee reads a Pune lead.** Identity ✔ → structure ✔ → no deny → allow-grant Scope
   (`Salam Cola, under Pune, Marketing, Lead`) matches stamp → conditions none → **ALLOW**.
2. **Same employee reads a Nagpur lead.** Allow-grant Scope location = *under Pune*; record path
   `IN/MH/NG/…` not prefixed by `IN/MH/PN` → no allow matches → **DENY (default)**.
3. **Employee reads a Finance invoice.** No grant carries `invoice.read` in scope → **DENY (default)**;
   even if a stray allow existed, a `DENY payroll.*`-style carve-out would still bind.
4. **Two roles conflict.** Role A allows `invoice.approve`; a Policy denies approval when
   `amount > 1,000,000 AND authLevel < mfa`. For a 2M invoice on a `pwd` session → **DENY (explicit
   deny/condition)**; deny precedence.
5. **Regional manager lists invoices.** `scopeFilter` = `entity=Salam Cola AND path LIKE 'IN/MH/%'` →
   query returns Pune + Nagpur rows only, in one query.
6. **AI asked to export all customers.** Subject can read only Pune customers → AI's filter = subject's
   filter → export contains Pune customers only; `customer.export` also checked (may be denied) → possibly
   **DENY**.
7. **Break-glass during outage.** On-call activates break-glass (reason logged) → gains temporary read on
   a suspended Entity's Records to diagnose → every access flagged + audited → auto-expires; an explicit
   `DENY salary.field` still redacts payroll.

---

## 9. Security boundaries

- **One gate, data-boundary enforced** — UI/API/AI cannot diverge; the query filter is the last line
  (R1/R10).
- **Fail-closed everywhere** — default deny, deny-precedence, error ⇒ deny (R2/R3/R13).
- **Isolation is rule #1** — cross-Organization/Workspace is denied before any grant is consulted.
- **AI is capped by the human** — structurally, via subject-intersection (R11).
- **Break-glass can't defeat hard denies** and is always audited (R8).
- **Decisions are pure & logged** — reproducible and explainable (R12/R13).
- **No module/industry logic in the engine** — it matches opaque keys and node paths (R14).

---

## 10. Edge cases (evaluation-level)

| # | Case | Engine behavior |
|---|---|---|
| 1 | Allow + Deny both match | **DENY** (precedence rule 3) |
| 2 | Grant expired mid-session | Treated absent → **DENY**; session is not authority |
| 3 | Ancestor node suspended, descendant grant exists | Structural DENY (rule 2) before allows |
| 4 | Record moved to another Entity | Re-stamped coordinates re-evaluated; may flip ALLOW→DENY |
| 5 | Direct API call, no UI | Same `decide()`/filter; **no bypass** |
| 6 | List with mixed permitted/denied rows | `scopeFilter` returns only permitted; denied never leave the DB |
| 7 | AI requests action user lacks | Subject-intersection → **DENY** |
| 8 | Two managers, overlapping regions, one has a deny | Deny binds for matched records only; other's access unaffected |
| 9 | Break-glass vs explicit DENY | Explicit DENY still wins (§6.2) |
| 10 | Engine data incomplete / exception | **DENY** `engine-error` (fail-closed) |

The exhaustive 23-case operational catalogue (incl. offboarding, field-level, cross-region reporting,
delegated admin) is resolved in `OCTIEN_EFFECTIVE_ACCESS_MODEL.md`.

---

## 11. Verification criteria

- [ ] Exactly one `decide()` authority; UI, API, and AI all route through it (no second code path).
- [ ] Identical inputs always yield identical decisions (determinism harness).
- [ ] An explicit DENY beats any set of allows, including break-glass.
- [ ] Absence of a matching allow yields DENY (never "allow by default").
- [ ] List/query access is enforced by an engine-generated **filter pushed into the query**, not a
      post-fetch loop — a forgotten UI check cannot leak rows.
- [ ] An AI tool call can never touch a record the subject user couldn't.
- [ ] Every decision emits an auditable reason trace.
- [ ] The engine contains no reference to any specific module, resource meaning, entity, or industry.

---

## 12. Open decisions

1. **Scope-filter generation vs the ORM/query layer:** how the predicate is compiled into Prisma/SQL
   safely (parameterized, injection-proof) — implementation-time, but the contract (predicate shape) is
   fixed here.
2. **Grant-set cache invalidation:** event-driven (on grant/role/policy change) vs short TTL vs
   `scopeSetRef` bump — leaning event-driven bump of `scopeSetRef`.
3. **Policy condition evaluation cost:** are ABAC conditions allowed to reference other records (joins)?
   If so, bounded how? (Perf vs power.)
4. **Break-glass policy owner:** who can define/activate it, and mandatory dual-control?
5. **Decision audit volume:** audit every decision, or only denies + sensitive allows + break-glass?
   (Signal vs noise vs compliance.)
6. **Field-level enforcement site:** redact in the engine's projection vs at serialization — must be a
   single, non-bypassable point.

---

**This document defines how a single decision is made and enforced.** *Why* a given principal can or
cannot reach a given record — the human-facing explanation, the admin visibility tools, and the full
edge-case catalogue — is `OCTIEN_EFFECTIVE_ACCESS_MODEL.md`.
