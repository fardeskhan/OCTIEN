# OCTIEN IAM — Increment 2D Shadow Authorization Report (READ-ONLY)

> The OCTIEN Permission Engine CODE evaluated in parallel with the legacy path over the full
> pilot decision space. Legacy remains authoritative; the engine is wired to NOTHING in the
> request path. Read-only; no writes. Generated: 2026-08-12T10:42:01.878Z
> Engine: apps/frontend/src/lib/iam/permission-engine.ts · Database: `neondb` @ `<redacted-neon-host>`

## Snapshot fed to the engine

- principals: 2 · entities: 3
- grants: 4 · scope dimensions: 4
- roles with permissions: 1 · registered actions: 29
- permission pairs (matrix actions): 29

## 1. Point-decision shadow (engine.decide vs legacy)

- Matrix tuples: **174** (principals 2 × entities 3 × pairs 29) + 8 edge tuples
- Matches: **182** · Mismatches: **0** ✔

## 2. List/set shadow (engine.scopeFilter vs legacy entity sets)

- (principal,resource,action) sets compared: **58**
- Mismatches: **0** ✔

## 3. Edge cases (through the engine)

| # | Case | legacy | engine | reason | match |
|---|---|---|---|---|---|
| 1 | unknown-resource | DENY | DENY | unregistered-resource-action | ✔ |
| 2 | unknown-action | DENY | DENY | unregistered-resource-action | ✔ |
| 3 | unknown-entity | DENY | DENY | unknown-entity | ✔ |
| 4 | unknown-principal | DENY | DENY | unknown-principal | ✔ |
| 5 | entity-with-membership(ALLOW) | ALLOW | ALLOW | grant+scope+role-permission | ✔ |
| 6 | entity-without-membership(DENY) | DENY | DENY | no-matching-allow (default-deny) | ✔ |
| 7 | entity-with-membership(ALLOW) | ALLOW | ALLOW | grant+scope+role-permission | ✔ |
| 8 | entity-without-membership(DENY) | DENY | DENY | no-matching-allow (default-deny) | ✔ |

## FINAL SHADOW RESULT

| Dimension | Mismatches |
|---|---|
| point decisions | 0 |
| list/set | 0 |

**TOTAL SHADOW MISMATCHES: 0**

**IAM Increment 2D — SHADOW VERIFIED ✔** — the OCTIEN Permission Engine code reproduces today's authorization decisions exactly. Legacy remains authoritative; nothing was enforced or wired into requests.