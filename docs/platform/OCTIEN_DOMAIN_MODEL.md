# OCTIEN Domain Model — Universal Business Language

**Status:** DESIGN ONLY — vocabulary/reference, no code, no schema.
**Companion:** `OCTIEN_PLATFORM_CORE.md`.
**Purpose:** the single **ubiquitous language** for the entire OCTIEN platform. Every module, screen,
API, permission, AI tool, and document uses **these terms with these meanings** — no synonyms, no
re-invented concepts. This is what keeps a hospital module and a manufacturing module speaking the
same language as OCTIEN grows.

> Rule: if a concept exists here, use its name. Do not introduce "company/account/tenant" for
> *Organization*, "business/unit/branch" for *Entity*, "group" for *Team*, "privilege" for
> *Permission*, etc. New concepts are **added here first**, then used.

---

## 1. Platform structure

| Term | Definition | Relationships |
|---|---|---|
| **Platform** | the OCTIEN deployment itself; operator scope | contains Organizations |
| **Organization** *(Tenant)* | a customer; the hard **isolation boundary** — every record belongs to exactly one | has Workspaces, Users, Roles, a Tenant Configuration, a License |
| **Workspace** | an operating context within an Organization (env / division / brand grouping); spans multiple currencies, taxes, languages, timezones | belongs to an Organization; contains Entities |
| **Entity** | a **sector-neutral operating unit** — company, hospital, school, factory, warehouse, store, NGO, government office, clinic, hotel, site… — created from an **Entity Template** | belongs to a Workspace; has Locations, Departments; owns Records |
| **Entity Template** | an **installable** definition of an entity kind (Hospital, Manufacturer, Store…) bundling default Capabilities/modules, permissions, dashboards, reports, AI, workflows, branding; versioned, has a Lifecycle State | instantiated as Entities; requires Capabilities |
| **Location** | a node in the geographic tree: `Country → State → Region → District → City → Branch → Warehouse` (use whatever depth fits) | belongs to an Entity; nests under a parent Location |
| **Department** | a function within an Entity (Sales, Finance, HR, Manufacturing, Pharmacy, Admissions…) | belongs to an Entity/Location; contains Teams |
| **Team** | a working group within a Department | belongs to a Department; has Users |

*COSMY mapping:* Organization = COSMY; Entities = Salam Cola, COSMY UCO, Casa de Lumas.

---

## 2. Identity & Access

| Term | Definition | Relationships |
|---|---|---|
| **User** | an identity acting in the platform; belongs to one Organization, may hold roles at many nodes | assigned Roles with Scopes |
| **Permission** | an atomic capability expressed as `resource.action` (e.g. `invoice.approve`, `patient.read`) | grouped into Permission Groups / Roles |
| **Permission Group** | a named bundle of Permissions | composed into Roles |
| **Role** | a named set of Permissions/Groups assignable to a User | granted to Users with a Scope |
| **Scope** | *where* a Role applies, across dimensions: Organization · Workspace · Entity · Region · Branch · Department · Team · **Project** · Module · Resource · Record · Field | binds a Role to hierarchy/resource nodes |
| **Policy** | a rule that resolves ALLOW/DENY for an action given user, roles, scope, and record conditions (RBAC + ABAC); **default-deny, deny-overrides-allow** | evaluated by the Permission Engine for humans **and** AI |

---

## 3. Capability, composition & packaging

| Term | Definition | Relationships |
|---|---|---|
| **Capability** | an abstract unit of business function (`sales`, `inventory`, `clinical`, `scheduling`, `crm`, `pos`…) that decouples everything from concrete modules | **provided by** Modules · **required by** Solution Packs/Templates · **authorized by** Permissions · **consumed by** AI |
| **Module** | a self-registering, reusable unit that **provides Capabilities** and contributes navigation, permissions, resources, routes, AI tools, reports, dashboards, workflows, settings, search providers, quick actions, notifications, events | registered in the Module Runtime; provides Capabilities; enabled via Solution Packs / Feature Flags |
| **Resource** | a business object **type/definition** (Customer, Invoice, Product, Employee, Asset, Machine, Patient, Student, Appointment, Case…) | owned by a Module; instantiated as Records; targeted by Permissions |
| **Solution Pack** | a curated configuration that **requires Capabilities** and enables a bundle of modules + defaults — industry (Healthcare, Retail…) **or** functional (POS, CRM, Field Service, Project); versioned, has a Lifecycle State | requires Capabilities; applied to a Workspace |
| **Feature Flag** | a per-Organization on/off for solutions, modules, capabilities, AI, beta, experimental, reports | part of Tenant Configuration |
| **Metadata** | the data-driven definition of platform artifacts (Entity, Module, Capability, Permission, Workflow, Field, Dashboard, Report, AI Agent, Notification, Automation, Template, Pack) — enables low/no-code + AI-generated modules with no core change | read by the runtime to render everything |
| **Lifecycle State** | the governance state of any registered artifact: `Draft → Experimental → Preview → Stable → Deprecated → Archived` | carried by Modules, Capabilities, Packs, Templates, Workflows, AI Agents, Extensions, Reports, Dashboards |
| **Extension** | a customer customization that **plugs in** (Widget, Dashboard, Workflow, Automation, Integration, Theme, AI Tool, Report) without modifying core modules; scoped to an Organization, sandboxed, has a Lifecycle State | registered like a Module; belongs to an Organization |
| **Application** | the composed, running product a tenant sees (Workspace + Entities + enabled Capabilities/modules) | result of Tenant Configuration |
| **Tenant Configuration** | per-Organization settings: Solution Packs, enabled modules, feature flags, currencies, taxes, languages, timezones, branding | belongs to an Organization |
| **License** | entitlement defining what an Organization may use (packs/modules/capabilities/seats/limits) | governs Tenant Configuration |

---

## 4. Work & records

| Term | Definition | Relationships |
|---|---|---|
| **Record** | an instance of a Resource, stamped with its hierarchy position (Org→Workspace→Entity→Location→Department→Team→Project) at creation | instance of a Resource; scoped by that stamp |
| **Project** | a cross-cutting unit of work that may span Entities/Departments; a first-class Scope dimension | groups Records/Tasks; a Scope target |
| **Workflow** | a defined multi-step process (approvals, routing, state machines) a Module registers | operates on Records; creates Tasks; emits Notifications/Audit |
| **Task** | a unit of work assigned to a User/Team (often produced by a Workflow) | belongs to a User/Team; may reference a Record/Project |
| **Activity** | a timeline entry describing something that happened (created, updated, approved…) | attached to a Record/Project; feeds the shell activity feed |
| **Comment** | user-authored note on a Record/Project/Task | belongs to a Record; authored by a User |
| **Attachment** *(File)* | a stored file linked to a Record/Comment/Message | belongs to a Record/Comment; managed by the Files service |

---

## 5. Platform services (shared, provided once)

| Term | Definition | Relationships |
|---|---|---|
| **Event** | a typed, scoped fact that something happened (`invoice.created`, `patient.admitted`); the unit of loose coupling | emitted by Modules/Workflows onto the **Event Bus**; consumed by subscribers (Inventory, Finance, Notifications, Audit, AI, Analytics) |
| **Notification** | a typed, severity-tagged message surfaced in the shell Notification Center (often triggered by an Event) | published by Modules/Workflows; scoped to Users |
| **Audit Event** | an immutable record of a security/data-relevant action, with actor, scope, and reason | emitted by the Permission Engine & Modules |
| **Dashboard** | a composed page of Widgets for a role/context | built from Widgets; contributed by Modules |
| **Widget** | a single visualization/metric unit (KPI, chart, list) | placed on Dashboards |
| **Report** | a defined, runnable data view/export | contributed by Modules; permission-scoped |
| **Search Provider** | a `SearchSource` plugin feeding the shell search platform | registered by a Module |
| **Quick Action** | a ＋New entry contributed to the header | registered by a Module |
| **Integration** | an external system connection (in/out) | configured per Tenant |
| **Calendar Event** | a scheduled item (appointment, shift, deadline) | linked to Records/Users |
| **Message** | a messaging-service item between Users | references Users; may carry Attachments |

---

## 6. AI

| Term | Definition | Relationships |
|---|---|---|
| **AI Runtime** | the provider-agnostic execution layer (swappable model/provider) | runs Agents/Assistants |
| **AI Capability** | a class of thing the AI may do here (summarize, analyze, draft, navigate) — access-gated | used by Agents |
| **AI Tool** | a scoped function a Module registers for the AI to call; passes the **same** permission gate as a human action | registered by a Module; invoked by Agents |
| **AI Agent** | a goal-driven composition of Capabilities + Tools | uses Tools; runs on the Runtime |
| **AI Assistant** | a user-facing persona (Sales AI, Inventory AI, Finance AI, HR AI, CEO AI) = a **configuration** of Agents/Capabilities, surfaced in the frozen AI panel | configured per role/context |

---

## 7. Forbidden synonyms (use the canonical term)

| Do **not** say | Say |
|---|---|
| company, account, tenant, client | **Organization** (Tenant is an accepted alias for Organization) |
| environment, instance, stage | **Workspace** |
| business, business unit, branch, division, unit | **Entity** (Branch is only a *Location* type) |
| entity type, kind | **Entity Template** |
| privilege, right, grant, entitlement (for access) | **Permission** |
| feature, function (a unit of business function) | **Capability** |
| access rule, ACL entry | **Policy** |
| app, feature (for a capability unit) | **Module** |
| object, entity (for a business object), model | **Resource** (its type) / **Record** (its instance) |
| industry pack, bundle, edition, plan | **Solution Pack** |
| toggle, switch, setting (for on/off) | **Feature Flag** |
| plugin, add-on, customization | **Extension** |
| signal, message (for a domain fact) | **Event** |
| status, stage (for governance) | **Lifecycle State** |
| group (for people) | **Team** |
| log entry (for security) | **Audit Event** |
| bot, chatbot, copilot (generic) | **AI Assistant** (backed by **AI Agent / Tool / Capability / Runtime**) |

---

**This vocabulary is binding for all future OCTIEN design and implementation.** New concepts are added
here first, then used consistently everywhere.
