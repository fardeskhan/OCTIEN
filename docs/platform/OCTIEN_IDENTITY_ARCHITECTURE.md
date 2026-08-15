# OCTIEN Identity Architecture — Who Acts in the Platform

**Status:** DESIGN / ARCHITECTURE ONLY — no code, no Prisma, no Better Auth changes, no middleware, no UI.
**Companions:** `OCTIEN_PLATFORM_CORE.md`, `OCTIEN_DOMAIN_MODEL.md` (binding vocabulary),
`OCTIEN_ORGANIZATION_MODEL.md`, `OCTIEN_ACCESS_CONTROL_MODEL.md`, `OCTIEN_PERMISSION_ENGINE.md`,
`OCTIEN_EFFECTIVE_ACCESS_MODEL.md`.
**Depends on:** CAP-SHELL V1.0 (frozen). Everything renders inside the frozen shell.

> This document defines **the actors** — who (or what) can be authenticated and can hold access in
> OCTIEN — and the boundary that establishes identity *before* any authorization question is asked.
> Identity answers **"who is acting?"**. Authorization (the other documents) answers **"may this actor
> do this here?"**. The two are deliberately separate layers.

---

## 1. Purpose

Establish the identity substrate the whole platform stands on:

- The **principals** that can act: human **Users** and non-human **AI Agents / Service principals**.
- The **isolation boundary** (Organization) every identity belongs to.
- The **operating environment** (Workspace) an identity acts within.
- The **Session / credential** model that proves an identity.
- The **identity lifecycle** — invite → active → suspended → offboarded — and what each state means
  for access.
- The rule that **every** actor, human or AI, resolves to a principal that passes the **same**
  authorization gate.

Identity is industry-agnostic: it knows *User*, *Organization*, *Workspace*, *Session*, *Principal* —
never *Salam Cola*, *hospital*, or *COSMY*. Those are data inside an Organization, not identity concepts.

---

## 2. Current-state audit

From the frozen backend foundation (`packages/database/prisma/schema.prisma`, `apps/frontend/src/lib/auth.ts`):

| Area | Today | Assessment |
|---|---|---|
| Auth | Better Auth, `emailAndPassword` only | Works; single credential type; no SSO/MFA |
| `User` | `id, tenantId, name, email, emailVerified, image` | Belongs to exactly one `Tenant` (Organization) ✔ |
| Tenant binding | `databaseHooks.user.create.before` hardcodes `tenantId: "tnt_demo_001"` | **Every new user is forced into one demo tenant** — blocks real multi-tenant onboarding |
| `Session` | Better Auth session (`token`, `expiresAt`, `ipAddress`, `userAgent`) | Standard; no Workspace context, no scope snapshot |
| `Account` | Better Auth (`providerId`, `password`, OAuth token fields) | Ready for OAuth/social, none configured |
| Non-human actors | none | AI has no principal identity; cannot be gated as an actor today |
| Workspace | none | No environment context on the session |
| Identity lifecycle | none (no `status` on `User`) | Cannot suspend/offboard without deleting |

**Net:** authentication exists and is sound; **identity is single-tenant, human-only, environment-less,
and has no lifecycle**. It cannot yet express "this AI acts as this user in this workspace" or
"temporarily suspend this user".

---

## 3. Problems

1. **Hardcoded tenant.** A single `tnt_demo_001` is stamped on every user — there is no true
   Organization boundary at identity time.
2. **No Workspace on the session.** An actor is not situated in Production vs Sandbox vs Demo, so data
   isolation by environment is impossible.
3. **Human-only principals.** AI and background/service actors have no identity, so they cannot pass the
   same gate as a human (a core platform promise).
4. **No lifecycle.** Users can only exist or be deleted; there is no *suspended* (temporary disable) or
   *offboarded* (retain history, revoke access) state.
5. **No identity-level audit of security events** (login, impersonation, suspension) distinct from data
   audit.
6. **Credential model is fixed** to email+password; enterprise buyers will require SSO/MFA, which the
   identity layer must accommodate without leaking into authorization.

---

## 4. Requirements

- **R1** Every principal belongs to exactly one **Organization** (hard isolation). No cross-Organization
  identity.
- **R2** A principal acts inside exactly one **Workspace** per session; the Workspace is part of the
  security context.
- **R3** Support multiple **principal kinds** — `User` (human), `AI Agent`, `Service` — behind one
  `Principal` abstraction, all authorizable.
- **R4** **AI never has ambient authority.** An AI action runs *on behalf of* an acting User (or an
  explicitly-configured, lower-or-equal service principal) and can never exceed that subject's effective
  access.
- **R5** A full **identity lifecycle**: `Invited → Active → Suspended → Offboarded` (+ `Locked` for
  security), with defined access semantics for each.
- **R6** **Credential-agnostic** authentication: email/password today; SSO (OIDC/SAML) and MFA must slot
  in without changing authorization.
- **R7** The **Session** carries an immutable security context: principal, Organization, Workspace, and a
  reference to the scope set used for evaluation (see Permission Engine).
- **R8** **Default deny** begins at identity: an unauthenticated request, an expired session, a suspended
  principal, or a principal with no Workspace context is denied before authorization even runs.
- **R9** Security-relevant identity events are **audited** immutably (login, logout, MFA, impersonation,
  suspension, offboarding).
- **R10** No industry, entity, or client concept ever appears in the identity layer.

---

## 5. Terminology (this document)

Uses `OCTIEN_DOMAIN_MODEL.md` and adds identity-layer specifics:

| Term | Definition |
|---|---|
| **Principal** | Any actor that can be authenticated and authorized. Kinds: `User`, `AI Agent`, `Service`. The unit the Permission Engine evaluates. |
| **User** | A human Principal; belongs to one Organization; may hold Roles at many nodes. |
| **AI Agent (principal)** | A non-human Principal that always executes *on behalf of* a subject Principal; derives its effective access from that subject unless a narrower explicit policy applies. |
| **Service (principal)** | A non-human Principal for integrations/automation, with its own explicitly-granted (never inherited-upward) scope. |
| **Organization (Tenant)** | The isolation boundary an identity belongs to. |
| **Workspace** | The operating environment a session is bound to (Production / Sandbox / Demo…). |
| **Session** | Proof of an authenticated Principal within an Organization + Workspace, for a bounded time. |
| **Credential** | The secret/assertion proving identity (password, OIDC token, SAML assertion, MFA factor). |
| **Identity State** | Lifecycle state of a Principal (Invited/Active/Suspended/Locked/Offboarded). |
| **Impersonation** | A privileged, audited, time-boxed act where an admin operates *as* another User — subject to that User's access, never expanding it. |

> **Authentication ≠ authorization.** This layer proves *who*. It stores **no** permissions. Whether an
> authenticated principal may do something is decided entirely by the Access Control model + Permission
> Engine.

---

## 6. Architecture

### 6.1 The principal abstraction

```
                         ┌──────────────┐
                         │  Principal   │  ← what the Permission Engine evaluates
                         │  (abstract)  │
                         └──────┬───────┘
             ┌──────────────────┼───────────────────┐
             ▼                  ▼                    ▼
        ┌─────────┐       ┌───────────┐       ┌────────────┐
        │  User   │       │ AI Agent  │       │  Service   │
        │ (human) │       │ principal │       │ principal  │
        └─────────┘       └─────┬─────┘       └────────────┘
                                │ acts on behalf of
                                ▼
                          subject Principal (a User)
                          effective access = min(subject, agent policy)
```

Everything downstream authorizes a **Principal**. Whether it is a human at a keyboard, an AI tool call,
or a nightly integration, authorization asks the *same* question of the *same* abstraction. This is what
makes "AI can never exceed the user" structural rather than a bolt-on check.

### 6.2 Identity within the platform hierarchy

```
Platform
└── Organization (isolation boundary)          ← Principal belongs here (R1)
    ├── Principals: Users · AI Agents · Services
    └── Workspace (Production / Sandbox / Demo) ← Session binds here (R2)
        └── Entities → Locations → Departments → Teams → Projects   (see Organization Model)
```

A Principal is owned by an Organization. A **Session** situates that Principal in one Workspace. Access
*within* that Workspace is decided by scopes over Entities/Locations/Departments/etc. — the subject of
the Organization and Access Control documents.

### 6.3 Session & security context

A Session is minted at authentication and carries an **immutable security context** for its lifetime:

```
Session {
  principalRef      → who
  organizationRef   → isolation boundary (R1)
  workspaceRef      → environment (R2)
  scopeSetRef       → snapshot/version of the principal's scope assignments used for evaluation
  authLevel         → e.g. pwd | pwd+mfa | sso   (for step-up decisions)
  issuedAt / expiresAt / lastSeen
  deviceRef         → ipAddress, userAgent (already captured today)
}
```

- The Workspace is **chosen at/after login** and fixed per session; switching Workspace starts a new
  security context (not a mutation of the current one).
- `scopeSetRef` lets the engine evaluate against a **consistent** view and lets Effective Access explain
  *which* assignments were in force (see `OCTIEN_EFFECTIVE_ACCESS_MODEL.md`).
- The Session stores **no permissions** — only enough to *find* them. Revoking access takes effect on the
  next evaluation, not "whenever the token refreshes".

### 6.4 Authentication is pluggable; authorization is not coupled to it

```
Credential providers (pluggable)        Authorization (single, stable)
──────────────────────────────         ───────────────────────────────
email + password  ─┐
OIDC / SSO        ─┼─► authenticate ─► Principal + Session ─► Permission Engine (one gate)
SAML              ─┤
MFA factor (step) ─┘
```

Adding SSO or MFA changes **how** a Principal is proven, never **what** they may do. `authLevel` on the
session lets policies later demand step-up (e.g. "approving a payment requires `pwd+mfa`) without the
identity layer knowing anything about payments.

### 6.5 AI & service principals (the same-gate promise)

- An **AI Agent** action is always initiated within a subject's session. Its effective access is
  `intersect(subject effective access, agent policy)` — **never** a superset. If the subject cannot read
  `invoice`, neither can the AI acting for them. (Full rule in Permission Engine §"AI".)
- A **Service** principal has its **own** explicitly-granted scopes (for unattended jobs). It does **not**
  inherit any user's access and cannot self-elevate; its grants are owner-administered like any Role
  assignment.
- Both are Principals → both pass the identical Permission Engine gate → both are audited as actors.

### 6.6 Identity lifecycle (state machine)

```
        invite sent            accepts + sets credential
 (none) ───────────► Invited ───────────────────────────► Active
                                                            │  │  ▲
                              admin suspends (temporary) ◄──┘  │  │ admin reinstates
                                        Suspended ─────────────┘  │
                                                                  │
             too many failed / security event ► Locked ──unlock──┘
                                                                  │
                              admin offboards (permanent) ►  Offboarded
```

| State | Can authenticate? | Holds access? | History retained? |
|---|---|---|---|
| **Invited** | no (until accept) | no | n/a |
| **Active** | yes | yes (per assignments) | yes |
| **Suspended** | no | **frozen** (assignments kept, all denied) | yes |
| **Locked** | no (until unlocked) | frozen | yes |
| **Offboarded** | no (permanent) | none (assignments revoked) | yes (records/audit keep actor ref) |

**Suspended = temporary disable** (R5): the "temporarily disable access" owner power. Assignments are
preserved so reinstatement is one action; every authorization attempt short-circuits to DENY at the
identity gate. **Offboarded** revokes assignments but never deletes the Principal record, so historical
Records and Audit Events keep a valid actor reference.

### 6.7 Impersonation (support/admin, tightly bounded)

An authorized admin may operate **as** a User to reproduce an access problem. Rules: explicit permission
(`identity.impersonate`), time-boxed, **cannot exceed the target's effective access**, loudly audited
(start/stop, actor + subject), and surfaced in the UI. Impersonation is an *identity* mechanism that
*borrows* authorization — it never grants any.

---

## 7. Relationships

```
Organization 1───* Principal            (User | AI Agent | Service)
Principal    1───* Session              (each bound to one Workspace)
Principal    1───* Credential           (password | OIDC | SAML | MFA factor)
Session      *───1 Workspace
AI Agent     *───1 subject Principal     (acts on behalf of)
Principal    1───1 Identity State
Principal    1───* Audit Event (identity)  (login, mfa, impersonation, suspend, offboard)
```

Authorization objects (Role, Permission, Scope, Policy) attach to the **Principal**, and are defined in
`OCTIEN_ACCESS_CONTROL_MODEL.md`. Identity intentionally does not model them.

---

## 8. Examples

1. **Human login (COSMY as first tenant).** A user authenticates → Principal resolved in Organization
   *COSMY* → chooses Workspace *Production* → Session minted with that context. What they can see inside
   Production is decided later by scopes over Salam Cola / Pune / Marketing (data, not identity).
2. **AI acting for a user.** The Marketing employee asks the Sales AI to "list overdue invoices". The AI
   Agent principal runs inside their session; its effective access is intersected with theirs → it can
   only surface invoices the employee could already read. No new authority is created by asking the AI.
3. **Suspend during investigation.** Owner suspends an employee mid-incident → next request (UI, API, or
   AI) is denied at the identity gate; assignments untouched; reinstating restores access instantly.
4. **Offboarding.** Employee leaves → Offboarded → assignments revoked, but the Journal Entries they
   posted still resolve their name via the retained (inactive) Principal.
5. **Nightly integration.** A Service principal with an explicit, narrow scope syncs data unattended —
   audited as its own actor, unable to borrow any user's broader access.

---

## 9. Security boundaries

- **Isolation:** a Principal exists in exactly one Organization; sessions cannot cross Organizations.
  Cross-Organization access is not representable at the identity layer (R1).
- **Environment:** data reached in a session is bounded by its Workspace (R2); a Production session
  cannot touch Sandbox data.
- **No ambient AI/service authority:** non-human principals never self-elevate; AI is capped by its
  subject, Services by explicit grant (R4).
- **Identity stores no permissions:** compromise of session state does not reveal or grant authority;
  authority lives in assignments evaluated fresh (R7/R8).
- **Fail closed:** unauthenticated / expired / suspended / locked / no-Workspace ⇒ DENY before
  authorization runs (R8).
- **Auditability:** all identity security events are immutable and attributable (R9).
- **Least authentication surface:** credential providers are additive and isolated; a new provider can't
  widen authorization (R6).

---

## 10. Edge cases (identity-layer)

| # | Case | Identity-layer handling |
|---|---|---|
| 1 | Session valid but Principal just suspended | Deny at gate on next request; do not wait for token expiry |
| 2 | Session valid but underlying assignments changed | Re-evaluate against current scope set; session is not a cache of authority |
| 3 | Workspace disabled mid-session | Session invalid for that Workspace ⇒ deny; force re-selection |
| 4 | User belongs to Organization but has zero assignments | Authenticated but authorized for nothing (default deny) — a valid state |
| 5 | AI invoked outside any user session (e.g. scheduled) | Must run as an explicit Service principal, not "the AI"; else deny |
| 6 | Impersonation + target suspended | Impersonation cannot exceed target ⇒ effectively denied |
| 7 | Offboarded user referenced by old Records | Principal retained (inactive) so references resolve; no re-auth possible |
| 8 | MFA required by a policy but session is `pwd` only | Deny the specific action, prompt step-up; base session stays valid |
| 9 | Same human in two Organizations | Two **separate** Principals (one per Organization); never one identity spanning both |
| 10 | Concurrent sessions in different Workspaces | Allowed; each carries its own immutable context |

Data/authorization edge cases (multi-entity, multi-role conflicts, record moves, etc.) are catalogued in
`OCTIEN_EFFECTIVE_ACCESS_MODEL.md` — they are not identity concerns.

---

## 11. Verification criteria

- [ ] Every authorization decision in the platform takes a **Principal**, never a raw user row or role
      string.
- [ ] A Session cannot exist without `{Principal, Organization, Workspace}`; missing any ⇒ deny.
- [ ] An AI or Service action is always attributable to a Principal and, for AI, to a subject Principal.
- [ ] Suspending a Principal denies its next request without deleting assignments; reinstating restores
      them with no re-grant.
- [ ] Offboarding revokes assignments yet leaves historical actor references resolvable.
- [ ] Adding a credential provider (SSO/MFA) requires **zero** change to any authorization document.
- [ ] No identity artifact references any industry, entity name, or client concept.

---

## 12. Open decisions

1. **Multi-Organization humans:** confirmed model is *separate Principals per Organization*. Do we add a
   convenience "account switcher" that links them at the UI only (never at the authorization layer)?
2. **Workspace selection UX:** default to a "primary" Workspace vs always prompt? (Identity supports
   both; product decision.)
3. **Step-up granularity:** is `authLevel` a coarse ladder (`pwd < pwd+mfa < sso+mfa`) or a set of named
   factors policies can require individually?
4. **Service principal ownership:** are Service principals owned at Organization or Workspace scope?
5. **Session lifetime & absolute cap** for privileged principals (owner/admin) — shorter than standard?
6. **Impersonation dual-control:** require a second admin's approval for impersonating high-privilege
   users?

---

**This document defines the actors and the boundary. It grants nothing.** What any Principal may do is
decided by `OCTIEN_ACCESS_CONTROL_MODEL.md` + `OCTIEN_PERMISSION_ENGINE.md`, over the structure defined
in `OCTIEN_ORGANIZATION_MODEL.md`, and explained by `OCTIEN_EFFECTIVE_ACCESS_MODEL.md`.
