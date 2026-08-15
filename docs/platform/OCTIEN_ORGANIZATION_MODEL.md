# OCTIEN Organization Model — The Structure Access Is Scoped Over

**Status:** DESIGN / ARCHITECTURE ONLY — no code, no Prisma, no migrations, no UI.
**Companions:** `OCTIEN_PLATFORM_CORE.md`, `OCTIEN_DOMAIN_MODEL.md` (binding vocabulary),
`OCTIEN_IDENTITY_ARCHITECTURE.md`, `OCTIEN_ACCESS_CONTROL_MODEL.md`, `OCTIEN_PERMISSION_ENGINE.md`,
`OCTIEN_EFFECTIVE_ACCESS_MODEL.md`.
**Depends on:** CAP-SHELL V1.0 (frozen).

> This document defines the **structural hierarchy** every access decision is scoped over:
> `Organization → Workspace → Entity → Location → Department → Team → Project`. It is the **map**;
> the Access Control model draws the *boundaries* on it. Crucially, this structure is **generic** — it
> knows *Entity* and *Location*, never *Salam Cola* or *Pune*. Those are **data** that populate the map.

---

## 1. Purpose

- Define the nodes that access can be **granted at** and **inherited down**.
- Define the **geographic tree** (arbitrary depth) that satisfies the client requirement:
  *User → Entity → Location → Department* scoping.
- Establish **inheritance** and **lifecycle** (enable/disable) semantics for every structural node, since
  disabling a node must cascade to access and data visibility.
- Keep the entire structure **industry-agnostic**: the same shape serves a beverage distributor, a
  hospital chain, and a school network.

The worked requirement this model must express:

```
Marketing employee
  → Entity: Salam Cola
    → Location: India / Maharashtra / Pune
      → Department: Marketing
        → (Modules & Resources granted separately, see Access Control)
```

Everything left of "Modules" is **this document's** hierarchy.

---

## 2. Current-state audit

| Concept | Today (`schema.prisma`) | Gap |
|---|---|---|
| Organization | `Tenant` (`id, name, slug`) | Exists ✔; but every user hardcoded to `tnt_demo_001` |
| Workspace | — | **Missing** — no environment layer |
| Entity | `Business` (+ `BusinessType`) | Exists but **named for the domain** ("Business"), flat, no template link |
| Location | none for access; ad-hoc `city/state` strings on `CustomerAddress`, `DeliveryRunStop`, `AssetLocation` | **No hierarchical geographic tree**; cannot scope access by geography |
| Department | `department String?` free-text on `PurchaseRequisition`; `Membership` has none | **Not a structural node**; cannot scope by department |
| Team | — | **Missing** |
| Project | — | **Missing** |
| Record stamping | every ERP row carries `businessId` (+ `tenantId`) | Partitioned by Entity+Org only — **no Location/Dept/Team/Project stamp** |
| Node lifecycle | `Business.status` string; `Warehouse.isActive` | Partial; no consistent enable/disable + cascade semantics |

**Net:** the current structure is **two levels deep for access** (Tenant → Business) with geography and
department as free-text data, not scopeable nodes. The client's `Entity → Location → Department` requirement
cannot be represented today.

---

## 3. Problems

1. **Geography is not a tree.** City/state live as strings on unrelated tables; you cannot say "Pune and
   everything under it" or "all of Maharashtra".
2. **Department/Team/Project don't exist as nodes**, so access can't be scoped to them and Records can't
   be stamped with them.
3. **Domain-named structure.** `Business`/`BusinessType` bakes a vocabulary that fights the
   industry-agnostic goal (Domain Model mandates *Entity* / *Entity Template*).
4. **No Workspace**, so no environment isolation.
5. **No uniform lifecycle.** Disabling an Entity/Location must predictably cascade to access and data
   visibility; today it's inconsistent.
6. **Records are under-stamped** for fine-grained scoping (only `businessId`/`tenantId`).

---

## 4. Requirements

- **R1** Model the full chain as first-class nodes: `Organization → Workspace → Entity → Location →
  Department → Team → Project`.
- **R2** **Location is an arbitrary-depth tree** (`Country → State → Region → District → City → Branch →
  Warehouse → …`), each node typed, any depth per Entity.
- **R3** Every node has a **stable identity** independent of its display name (renaming Pune must not
  change who can access it).
- **R4** Access granted at a node **inherits downward** by default (grant at Maharashtra ⇒ covers Pune),
  and can be **narrowed** but not silently widened (Access Control defines the rules; this doc defines the
  tree they walk).
- **R5** Every structural node has a **Lifecycle State** (`Active → Suspended → Archived`) with defined
  **cascade** to descendants, access, and data visibility.
- **R6** Every **Record** is stamped at creation with its **full hierarchy position**
  (`Org → Workspace → Entity → Location → Department → Team → Project`) — the coordinates the Permission
  Engine matches scopes against.
- **R7** **Project** is a *cross-cutting* node: it may span Entities/Departments and is a first-class
  scope dimension (per Domain Model).
- **R8** The structure is **generic**; concrete instances (Salam Cola, Pune, Marketing) are **data**,
  created from **Entity Templates** and Location types — never enumerated in the platform core.
- **R9** Multi-membership is representable: a User may be attached at **many** nodes across **many**
  Entities (the assignment lives in Access Control; the nodes live here).

---

## 5. Terminology (this document)

Per `OCTIEN_DOMAIN_MODEL.md`, with structural emphasis:

| Term | Definition | Access role |
|---|---|---|
| **Organization** | Isolation boundary (a customer/tenant) | Top scope; hard partition |
| **Workspace** | Operating environment (Production/Sandbox/Demo) | Environment scope on the session |
| **Entity** | Sector-neutral operating unit from an Entity Template | Primary business scope |
| **Location** | Node in the geographic tree, of a `type` | Geographic scope (inherits down) |
| **Department** | Function within an Entity (Sales, Finance, Pharmacy…) | Functional scope |
| **Team** | Working group within a Department | Fine functional scope |
| **Project** | Cross-cutting unit of work spanning Entities/Depts | Cross-cutting scope |
| **Node** | Any of the above — a point a Role can be assigned at and a Record can be stamped with | — |
| **Hierarchy Stamp** | The set of node references recorded on a Record at creation | The coordinates scopes match |
| **Lifecycle State** | `Active → Suspended → Archived` on any node | Gates access + visibility |

---

## 6. Architecture

### 6.1 The structural spine

```
Organization  (isolation boundary — COSMY)
└── Workspace  (Production | Sandbox | Demo)
    └── Entity  (from an Entity Template — Salam Cola, COSMY UCO, Casa de Lumas)
        ├── Location  (arbitrary-depth tree — see 6.2)
        ├── Department  (Sales, Finance, HR, Marketing…)
        │   └── Team  (Field Sales, Inside Sales…)
        └── ── ── ── ── ── ── ── ── ──
Project  (cross-cutting — may attach across Entities/Departments; first-class scope)
```

All seven are **generic node types**. The named instances are rows an Organization creates — the platform
core enumerates none of them (R8).

### 6.2 Location — arbitrary-depth geographic tree

```
Entity: Salam Cola
└── Country: India                 (type = COUNTRY)
    └── State: Maharashtra         (type = STATE)
        └── District: Pune Div.    (type = DISTRICT)   ← optional level, skippable
            └── City: Pune         (type = CITY)
                └── Branch: Pune-1 (type = BRANCH)
                    └── Warehouse: PNQ-WH-1 (type = WAREHOUSE)
```

- Each node: **stable id**, a **`type`** (from an open, config-driven set: Country/State/Region/District/
  City/Branch/Warehouse/Site/…), a **parent**, a display **name**, and a **Lifecycle State**.
- **Depth is not fixed.** A UAE clinic chain may use `Country → City → Branch`; an Indian distributor the
  full depth. The tree adapts per Entity (R2).
- Access references **nodes**, never label strings (R3). Renaming "Pune" changes a display name, not a
  boundary.
- **Materialized path** (e.g. `IN/MH/PN/…`) is recommended so "is X under Y?" (the core scope test) is a
  cheap prefix check. (Implementation detail, noted for the engine; not built here.)

### 6.3 Inheritance model

```
Grant at node N  ⇒  covers N and every descendant of N   (default; R4)

              Maharashtra ●───────── grant here
                 ├── Pune  ○  covered
                 │    └── Pune-1 ○ covered
                 └── Nagpur ○ covered
```

- **Downward inheritance** is the default: a Role scoped to *Maharashtra* reaches Pune and Pune-1.
- **Narrowing** is allowed (scope to *Pune* only). **Widening is never implicit** — you cannot be granted
  Pune and thereby reach Maharashtra. (Exact combination/deny rules: Access Control + Permission Engine.)
- Inheritance applies to **each dimension independently** — Location, Department, Entity all inherit down
  their own trees; the engine intersects across dimensions.

### 6.4 Record hierarchy stamp (the coordinates access matches)

Every Record is stamped at creation (R6):

```
Record (e.g. Invoice #10291)
  organizationRef : COSMY
  workspaceRef    : Production
  entityRef       : Salam Cola
  locationRef     : Pune-1            (path: IN/MH/PN/PN-1)
  departmentRef   : Sales             (nullable if not applicable)
  teamRef         : Inside Sales      (nullable)
  projectRef      : null | Project-X  (nullable; cross-cutting)
```

A scope is an assertion over these coordinates ("Entity=Salam Cola AND Location under Pune AND
Department=Marketing"). The Permission Engine matches a Record's stamp against a Principal's scopes.
Stamps are **immutable coordinates of origin**; controlled *moves* (record re-homed to another Location)
are an explicit, audited operation (see Effective Access edge cases), not a silent update.

### 6.5 Node lifecycle & cascade

```
Active ──suspend──► Suspended ──archive──► Archived
   ▲                    │
   └──── reinstate ─────┘        (Archived is terminal for access; data retained read-only)
```

| Node state | Access to node & descendants | Data (Records under it) |
|---|---|---|
| **Active** | per assignments | normal |
| **Suspended** | **denied** (temporary) for all principals except break-glass; assignments retained | visible read-only to those with prior read, per policy |
| **Archived** | denied (terminal); assignments to it become inert | retained, read-only for audit/reporting per policy |

Cascade rule: **suspending/archiving a node suspends/archives the subtree** for access purposes. Disabling
*Entity Salam Cola* denies Pune, Pune-1, and every Record stamped under it — in one action (satisfies the
owner power "temporarily disable" at any structural level).

### 6.6 Generic vs data — the invariant

```
PLATFORM CORE KNOWS (generic node types)      ORGANIZATION DATA (instances, configurable)
────────────────────────────────────────      ──────────────────────────────────────────
Organization                                   COSMY
Workspace                                       Production / Sandbox / Demo
Entity            ← Entity Template             Salam Cola / COSMY UCO / Casa de Lumas
Location (+ type) ← Location types              India / Maharashtra / Pune / Pune-1 / PNQ-WH-1
Department                                      Sales / Finance / HR / Marketing
Team                                            Field Sales / Inside Sales
Project                                         Q3 Launch / Plant Upgrade
```

If a proposed feature needs the platform core to *know* "Salam Cola" or "hospital", it is wrong — that is
data. This single invariant is what lets OCTIEN be one platform for many industries (R8).

---

## 7. Relationships

```
Organization 1───* Workspace
Workspace    1───* Entity
Entity       1───1 Entity Template (defines its default shape)
Entity       1───* Location (root)   Location 1───* Location (self, tree)
Entity       1───* Department        Department 1───* Team
Organization 1───* Project           Project *───* {Entity, Department}   (cross-cutting)
Node         1───* Record (via hierarchy stamp)
Node         1───1 Lifecycle State
Principal    *───* Node   (via Role assignments — defined in Access Control, not here)
```

---

## 8. Examples

1. **COSMY mapping.** Organization *COSMY* → Workspace *Production* → Entities *Salam Cola / COSMY UCO /
   Casa de Lumas*; Salam Cola's Location tree is `India → Maharashtra → Pune → Pune-1`; Departments
   *Sales/Marketing/Finance/HR*.
2. **Geographic grant.** Grant a regional manager a Role scoped to *Maharashtra* → reaches Pune, Nagpur,
   and their branches automatically (inheritance), without listing each city.
3. **Skip a level.** A small Entity uses `Country → City → Branch` and omits State/District — the tree
   allows it; scopes still work by path prefix.
4. **Cross-cutting Project.** "Q3 Launch" spans Salam Cola (Marketing) and Casa de Lumas (Sales); users
   are scoped to the Project and see only Project-stamped Records across both Entities.
5. **Disable an Entity.** Owner suspends *COSMY UCO* → all its Locations/Departments and every Record
   under it become inaccessible in one action; reinstating restores them.

---

## 9. Security boundaries

- **Organization is the hard wall.** No node, scope, or Record crosses Organizations.
- **Workspace isolates environments;** Production Records are unreachable from a Sandbox session.
- **Inheritance is downward-only;** a narrow grant can never widen by walking up the tree.
- **Lifecycle cascades deny;** a suspended/archived ancestor denies its whole subtree regardless of
  descendant assignments (deny-by-structure precedes allow-by-assignment).
- **Stamps are immutable coordinates;** moving a Record between nodes is explicit and audited, never a
  side effect.
- **Names are not identity;** access binds to node ids, so relabeling can't leak or revoke access.

---

## 10. Edge cases (structural)

| # | Case | Handling |
|---|---|---|
| 1 | Employee attached to **multiple Entities** | Multiple node assignments; engine unions per-Entity reach, still bounded by each |
| 2 | Employee works in **multiple cities** | Assign at each City node (or a common ancestor); inheritance covers descendants |
| 3 | **Location disabled** | Subtree denied via cascade (6.5); Records retained read-only per policy |
| 4 | **Entity disabled** | Whole Entity subtree denied in one action |
| 5 | **Record moves** between Locations | Explicit audited re-stamp; access recomputed from new coordinates |
| 6 | **Deep vs shallow trees** across Entities | Per-Entity depth is independent; path-prefix tests are depth-agnostic |
| 7 | **Cross-entity / cross-region reporting** | Needs a scope spanning multiple nodes/Entities (a reporting Role); default deny otherwise |
| 8 | Node **renamed** | Display-only; access unaffected (id-based) |
| 9 | **Orphan risk** (delete a parent with children) | Disallow hard-delete of non-empty nodes; use Archive + cascade instead |
| 10 | Department without Teams / Location without Warehouses | Legal; optional levels are skippable |

Conflict resolution *across roles/dimensions* and the full 23-case catalogue live in
`OCTIEN_EFFECTIVE_ACCESS_MODEL.md`; this table is limited to structural behavior.

---

## 11. Verification criteria

- [ ] The full chain `Organization → Workspace → Entity → Location → Department → Team → Project` exists as
      first-class nodes; none are free-text strings.
- [ ] Location supports arbitrary depth and per-Entity variation; "is X under Y?" is answerable by path.
- [ ] Every Record carries a complete hierarchy stamp at creation.
- [ ] Granting at an ancestor demonstrably reaches descendants; a descendant grant never reaches an
      ancestor.
- [ ] Suspending any node denies its entire subtree and all Records under it, reversibly.
- [ ] No platform-core artifact enumerates a specific Entity, Location, Department, or industry.
- [ ] The client scenario (Salam Cola → India/Maharashtra/Pune → Marketing) is expressible purely as data
      over generic nodes.

---

## 12. Open decisions

1. **Location `type` set:** fixed enum vs Organization-configurable type registry (leaning configurable
   for industry-agnosticism).
2. **Project scope semantics:** does a Project grant *intersect* with Entity/Location scopes, or *union*
   (open a cross-cutting window)? — must be pinned in the Permission Engine.
3. **Department under Location?** Can a Department be Location-specific (Pune Sales ≠ Nagpur Sales), or is
   Department Entity-wide with Location as a separate dimension? (Leaning: separate dimensions, combined by
   the engine.)
4. **Team spanning Departments** — allowed or forbidden? (Leaning: a Team belongs to one Department;
   cross-functional groups are Projects.)
5. **Record move policy:** which Roles may re-home a Record across Locations/Entities, and what audit is
   mandatory?
6. **Materialized path vs adjacency-only** for the Location tree (performance vs simplicity) — deferred to
   the engine doc.

---

**This document is the map. It defines where access can point, not who has it.** The boundaries drawn on
this structure are defined in `OCTIEN_ACCESS_CONTROL_MODEL.md`, evaluated by `OCTIEN_PERMISSION_ENGINE.md`,
and explained by `OCTIEN_EFFECTIVE_ACCESS_MODEL.md`.
