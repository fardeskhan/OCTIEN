# OCTIEN IAM — Increment 2G Enforcement Readiness Report

> Owner authority made explicit + snapshot load-once-per-request. Still NO enforcement — legacy
> authoritative. Verified through the real Permission Engine. Generated: 2026-08-14T20:54:21.561Z

## A. Owner authority is explicit (not a copy of migration-time permissions)

| Check | Result | Expected | OK |
|---|---|---|---|
| Owner ALLOWed a registered perm despite EMPTY role_permissions (authority ≠ copied perms) | ALLOW | ALLOW | ✔ |
| Owner ALLOWed a NEW module's registered perm (survives new modules) | ALLOW | ALLOW | ✔ |
| Owner DENIed an entity they have no grant for (entity-scoped like legacy) | DENY | DENY | ✔ |
| Owner DENIed an UNREGISTERED perm (registry gate applies; safer than legacy bypass) | DENY | DENY | ✔ |

Invariant demonstrated: **Owner authority ≠ 29 copied permissions** — the owner role's
`role_permissions` was EMPTY yet every registered permission (incl. a brand-new module's) was
ALLOWed within scope; an ungranted entity and an unregistered permission were DENIed.

## B. Restricted Marketing employee (in-memory simulation — no production data)

Scope: role limited to {customer, lead, campaign} @ Entity = Salam Cola.

| Check | Result | Expected | OK |
|---|---|---|---|
| Marketing emp ALLOWed customer.read @ Salam Cola | ALLOW | ALLOW | ✔ |
| Marketing emp ALLOWed lead.create @ Salam Cola | ALLOW | ALLOW | ✔ |
| Marketing emp ALLOWed campaign.read @ Salam Cola | ALLOW | ALLOW | ✔ |
| Marketing emp DENIed invoice.read (Finance) @ Salam Cola | DENY | DENY | ✔ |
| Marketing emp DENIed invoice.approve (Finance) @ Salam Cola | DENY | DENY | ✔ |
| Marketing emp DENIed inventory.adjust (Inventory) @ Salam Cola | DENY | DENY | ✔ |
| Marketing emp DENIed employee.manage (HR) @ Salam Cola | DENY | DENY | ✔ |
| Marketing emp DENIed payroll.read (Payroll) @ Salam Cola | DENY | DENY | ✔ |
| Marketing emp DENIed customer.read @ COSMY UCO (other entity) | DENY | DENY | ✔ |

Demonstrates real employee-level DENY: **Finance / Inventory / HR / Payroll and other entities**
are denied while Sales/CRM/Marketing resources are allowed. (Location/Department are engine
dimensions exercised at record level in 3D; this proves the Entity + Resource restrictions now.)

## C. Owner-aware engine vs legacy on REAL pilot data

- Point matrix: **174** tuples · owner roles detected: 2 · legacy ALLOW tuples: 116
- **Mismatches: 0** ✔

## Snapshot load-once-per-request strategy

- `shadow.ts` now loads the authorization snapshot via React `cache()` ⇒ **one build per request**,
  reused across every `requirePermission()` call (a page/action makes many). Engine decisions are
  sub-millisecond (2F: p99 = 1ms); the request pays the ~1.5s Neon load AT MOST ONCE, not per check.
- This is the exact data-loading pattern the authoritative engine (3A) must use: resolve the
  snapshot once alongside request/principal context, then decide in-memory.
- Further hardening for 3A (designed, not prematurely applied): warm/pooled Neon reads to collapse
  connection latency, and a short-TTL cache for near-static registry + role→permission data,
  invalidated on IAM writes. Target: engine authorization overhead in the low-single-digit ms.

## Result

**IAM Increment 2G — ENFORCEMENT READINESS VERIFIED ✔** — Owner authority is explicit and future-proof, restricted DENY behavior is correct, real-data parity holds with the owner-aware engine, and the snapshot loads once per request. Still no enforcement.