# OCTIEN Platform Core — Enterprise Platform Architecture

**Status:** DESIGN / ARCHITECTURE ONLY — no code, no database, no implementation.
**Companion:** `OCTIEN_DOMAIN_MODEL.md` — the platform's binding vocabulary (read alongside this).
**Depends on:** CAP-SHELL V1.0 (frozen). Everything renders inside the frozen shell.
**Revision:** v2 — incorporates Capabilities, Templates, Event Bus, Metadata Engine, Extensions,
Solution Packs, and Lifecycle States per review.

> OCTIEN Platform Core defines the platform every application is composed on: its structure, access,
> runtime, packaging, extensibility, and shared services. It reads as a product, not a task list.
> Nothing here is implemented — this is a design review.

---

## The platform stack

```
OCTIEN Platform Core
├── Identity                the actors: users, roles, permissions, policies, scopes
├── Organization (Tenant)   isolation boundary — a customer
├── Workspace               operational environment (Production / Sandbox / Demo)
├── Entity                  operating unit (via a Template) — company, hospital, school, store…
├── Location                geographic tree (Country → … → Warehouse)
├── Module Runtime          self-registering, reusable modules
├── Capability Engine       the decoupling layer — modules provide, packs require, perms authorize, AI consumes
├── Permission Engine       RBAC + ABAC policy evaluation (one gate for humans + AI)
├── Metadata Engine         everything-as-metadata → low-code / no-code / AI-generated, no core changes
├── Event Bus               everything emits events → loose coupling
├── Workflow Engine         multi-step processes, approvals, state machines
├── AI Runtime              Runtime → Capabilities → Tools → Agents → Assistants
├── Platform Services       Search · Notifications · Audit · Calendar · Files · Messaging · Reports · Analytics · Automation · Integration
├── Extension Runtime       customer customizations plug in (never modify core)
├── Solution Packs          enable curated Capability/module bundles (Healthcare, Retail, POS, CRM…)
└── Applications            the composed product a tenant actually runs
```

Read it inside-out: **structure + identity** at the base, then **module + capability + metadata**
runtime, then **permission/event/workflow/AI** engines, then shared **services**, then **extension +
packaging** on top, producing **Applications**. Every component is consumed, never re-implemented, by
modules.

---

## 0. Framing (brief)

**Audit:** built as "COSMY ERP" — single-tenant, single-industry, coarse access, ERP-centric
vocabulary. **Problems:** cannot serve hospitals/schools/ministries; no extensibility; high rework
risk. **Requirements:** multi-tenant · industry-agnostic via packs · fine-grained access · extensible
· shared services · shell-native · migratable (COSMY = first tenant) · neutral vocabulary ·
**metadata-driven** (low/no-code future) · **loosely coupled** (event-driven).

## 1. Vision (brief)

**OCTIEN is an Enterprise Business Operating System** — a multi-tenant platform any organization, in
any sector, configures into the software it needs. Not an ERP; the substrate applications are
*composed* on. **COSMY is the first tenant.** Philosophy: configuration over code · composition over
monolith · **policy over hardcoding** · **metadata over code** · **events over direct calls** · one
shell / many apps · isolation by default · neutral vocabulary · AI scoped to the acting user.

---

## Structure — Organization → Workspace → Entity → Location

### Organization (Tenant) — the isolation boundary
A customer. Every record belongs to exactly one. Cross-tenant access does not exist by default.

### Workspace — the operational environment *(kept, by design)*
A Workspace is an **operational environment** inside a tenant — not a today-requirement, a
future-proofing decision. It gives isolated environments **without creating new tenants**:

```
COSMY Group (Organization)
├── Production   → Salam Cola · COSMY UCO · Casa de Lumas
├── Testing      → Salam Cola
└── Demo         → (sample data)
```
(Same pattern as Microsoft → Production/Sandbox → Azure/Xbox/GitHub.) Config, data, and integrations
are isolated per Workspace; promotion between environments is a first-class future capability.

### Entity — the operating unit, created from a Template
An **Entity** is a sector-neutral operating unit. Its shape comes from an **Entity Template**, not a
hardcoded "type". A Template is **installable** and bundles the defaults an entity of that kind needs:

```
Entity  →  Template  →  Capabilities (+ modules, permissions, dashboards, reports, AI, workflows, branding)

Hospital Template     → clinical, scheduling, billing, pharmacy, inventory capabilities + defaults
Manufacturer Template → manufacturing, inventory, sales, procurement capabilities + defaults
Store Template        → pos, sales, inventory, crm capabilities + defaults
```
*COSMY:* Entities = Salam Cola / COSMY UCO / Casa de Lumas, each from a "Distribution/FMCG" template.
Templates have a **lifecycle** (see below) and are versioned so upgrades are governable.

### Location — geography-agnostic tree
```
Country → State/Province → Region → District → City → Branch → Warehouse/Site
```
Any depth; each node is a `Location` of a `type`. Access and reporting reference the tree, never fixed
labels. A UAE clinic chain may use Country → City → Branch; an Indian distributor the full depth.

---

## Identity & Permission Engine

`User · Permission (resource.action / capability.action) · PermissionGroup · Role · Scope · Policy`.
**Scope dimensions:** Organization · Workspace · Entity · Region · Branch · Department · Team ·
**Project** · Module · **Capability** · **Resource** · Record · Field.

- **RBAC + ABAC**, evaluated by the **Permission Engine** — never `if role == admin`. Default-deny;
  deny overrides allow.
- **One gate** for UI, API, and AI. The AI cannot exceed the acting user's scope.
- Worked cases unchanged: **Owner** = all; **Marketing Employee** = Salam Cola × Pune (City) ×
  Marketing dept × Sales/CRM/Marketing modules × Customer/Lead/Campaign resources only.
- Permissions authorize **Capabilities** (below) as well as raw resources, which keeps authorization
  stable as modules change.

---

## Module Runtime & Capability Engine

### Capabilities — the decoupling layer *(the biggest addition)*
A **Capability** is an abstract unit of business function — `sales · inventory · accounting ·
scheduling · clinical · education · crm · pos · procurement · …`. Capabilities sit **between** modules
and everything that uses them, so nothing is coupled to a concrete module:

```
Module         PROVIDES  capabilities
Solution Pack  REQUIRES  capabilities
Permission     AUTHORIZES capabilities
AI             CONSUMES  capabilities
```
A pack asks for the `clinical` capability; whichever module provides it satisfies the pack. Swapping
the module that provides a capability changes nothing for packs, permissions, or AI. The **Capability
Engine** resolves providers → requirers and exposes the capability graph.

### Module Runtime — plugin-first
Modules are independent and **self-register a manifest**; the platform **discovers** them:
```
Module manifest → capabilities provided · navigation · permissions · resources · routes ·
                  AI tools · reports · dashboards · workflows · settings · search providers ·
                  quick actions · notifications · events emitted/consumed · lifecycle state
```
Registry (examples): `Sales · Inventory · CRM · Finance · HR · Payroll · Manufacturing · Warehouse ·
Projects · EMR · Patients · Appointments · Pharmacy · Students · Admissions · POS · …`. They slot into
the frozen shell + platform services with **zero shell changes**.

### Resource vs Record — an explicit distinction
```
Resource  = the TYPE / definition        Invoice · Customer · Product · Patient · Student
Record    = an INSTANCE of a Resource     Invoice #10291 · Invoice #10292 · Patient P-0042
```
Permissions, workflows, APIs, and AI operate on **Resources** (the type) and **Records** (instances)
distinctly: `invoice.approve` is a Resource-level permission; a Scope's *Record* dimension constrains
*which instances*. This split is foundational for the Permission, Workflow, and Metadata engines.

---

## Metadata Engine *(long-term differentiator)*

Everything the platform manages is expressed as **metadata**, not hardcoded structures:
`Entity · Module · Capability · Permission · Workflow · Field · Dashboard · Report · AI Agent ·
Notification · Automation · Template · Solution Pack`. Because definitions are data, the platform can
later offer **low-code / no-code builders, visual designers, and AI-generated modules** — all without
changing core. Runtime reads metadata to render navigation, forms, permissions, dashboards, and
workflows. (This is why modules "register" rather than "compile in".)

---

## Event Bus *(loose coupling from day one)*

Modules never call each other directly; they **emit and subscribe to events**:
```
"invoice.created"
   → Event Bus
       → Inventory (reserve stock)     → Finance (post entry)
       → Notifications (alert)         → Audit (log)
       → AI (insight)                  → Analytics (aggregate)
```
Events are typed, scoped (carry their hierarchy stamp), and audited. New reactions are added by
subscribing — no producer changes. The Event Bus underpins Workflows, Notifications, Audit, Analytics,
and AI.

---

## Workflow Engine, AI Runtime, Platform Services

- **Workflow Engine** — registered, versioned multi-step processes (approvals, routing, state
  machines) operating on Records, producing Tasks, emitting events. Workflows have a lifecycle.
- **AI Runtime** — provider-agnostic stack: `Runtime → Capabilities → Tools → Agents → Assistants`.
  "Sales AI / Finance AI / CEO AI" are **configurations**. Every AI **Tool** passes the same
  Permission Engine gate as a human; the frozen AI panel is the surface.
- **Platform Services** — first-class, provided once, consumed by every module, re-implemented by
  none: **Search · Notifications · Audit · Calendar · Files · Messaging · Reports · Analytics ·
  Automation · Integration** (Identity, Workflow, AI, Event Bus are their own engines above).

---

## Extension Runtime *(customer customization without forking core)*

Customers extend the platform through **Extensions** that **plug in** — they never modify core
modules:
```
Extension  →  Widget · Dashboard · Workflow · Automation · Integration · Theme · AI Tool · Report
```
Extensions register through the same manifest mechanism as modules, are scoped to an Organization,
carry a lifecycle, and are sandboxed. This keeps core upgradable while customers customize.

---

## Solution Packs *(renamed from "Industry Pack")*

A **Solution Pack** enables a curated bundle of **Capabilities/modules + defaults** for a Workspace.
"Solution" (not "Industry") because packs also represent non-industry solutions:
```
Industry solutions:  Healthcare · Education · Retail · Restaurant · Hotel · NGO · Construction ·
                     Real Estate · Professional Services · Government · Manufacturing
Functional solutions: POS Pack · CRM Pack · Field Service Pack · Project Pack
```
Flow: `Module Runtime → Capability Engine → Solution Pack → Workspace Configuration`. Packs **require
capabilities**, not specific modules — so the same `Inventory` capability serves Healthcare and Retail
packs alike. Packs have a lifecycle and are versioned.

---

## Lifecycle States *(enterprise governance, applied everywhere)*

Every registered artifact carries a lifecycle state:
```
Draft → Experimental → Preview → Stable → Deprecated → Archived
```
Applies to **Modules · Capabilities · Solution Packs · Templates · Workflows · AI Agents · Extensions
· Reports · Dashboards**. Feature Flags + lifecycle together let an Organization run only Stable
artifacts, opt into Preview, and see Deprecated warnings — governable rollout at enterprise scale.

---

## Applications & Tenant Configuration

An **Application** is the composed, running product a tenant sees (Workspace + Entities + enabled
Capabilities/modules). **Tenant Configuration** = chosen Solution Pack(s), enabled modules, **Feature
Flags**, licensing/entitlements, currencies, taxes, languages, timezones, branding. Two tenants on one
codebase run different Applications purely by configuration.

---

## Next design documents (revised order — inside-out)

1. `OCTIEN_LOCATION_MODEL.md` — the geographic tree + address/geo model
2. `OCTIEN_MODULE_RUNTIME.md` — the module manifest & discovery contract
3. `OCTIEN_CAPABILITY_ENGINE.md` — capabilities, provider/requirer resolution
4. `OCTIEN_PLATFORM_SERVICES.md` — the shared services contracts
5. `OCTIEN_EVENT_BUS.md` — event taxonomy, delivery, scoping
6. `OCTIEN_METADATA_ENGINE.md` — everything-as-metadata & builder foundation
7. `OCTIEN_PERMISSION_ENGINE.md` — policy evaluation (RBAC + ABAC) & data partitioning
8. `OCTIEN_SOLUTION_PACKS.md` — pack model & catalog
9. `OCTIEN_EXTENSION_RUNTIME.md` — extension model & sandboxing
10. `OCTIEN_WORKFLOW_ENGINE.md` — workflow definitions & execution

### After approval (implementation order)
1. **OCTIEN Login & Authentication** redesign (premium, workspace/tenant-aware).
2. **IAM foundation** — RBAC + ABAC across every scope dimension.
3. **Organization / Workspace setup flow**.
4. **Module redesigns** (Dashboard → Sales → …), reusing the frozen shell + this architecture.

---

**Submitted for review.** No implementation begins until OCTIEN Platform Core is approved.
