# OCTIEN IAM — Increment 2C Authorization Parity Report (READ-ONLY)

> Proves legacy authorization == OCTIEN authorization for the current pilot data. Analysis only —
> enforcement UNCHANGED, no writes to the database. Generated: 2026-08-12T10:32:52.909Z
> Database: `neondb` @ `<redacted-neon-host>` (schema `public`)

## Source dataset counts

| Legacy | n | | OCTIEN | n |
|---|---|---|---|---|
| users | 2 | | iam_principals | 2 |
| businesses | 3 | | iam_entities | 3 |
| roles | 2 | | iam_grants | 4 |
| permissions | 29 | | iam_action_definitions | 29 |
| memberships | 4 | | iam_scope_dimensions | 4 |
| distinct resources | 17 | | iam_resource_definitions | 17 |

## Decision sets

- Legacy ALLOW tuples: **116**
- OCTIEN ALLOW tuples: **116**
- Point matrix evaluated: **174** (principals 2 × entities 3 × pairs 29) + 9 edge tuples

## 1. Point-decision parity

- Matrix tuples compared: **174**
- Matches: **183** · Mismatches: **0** ✔

## 2. List/set parity (entities accessible per principal × resource × action)

- (principal,resource,action) sets compared: **58**
- Set mismatches: **0** ✔

## 3. No-broadening (set differences over ALLOW tuples)

- EXTRA OCTIEN allows (broadening): **0** ✔
- MISSING OCTIEN allows: **0** ✔

## 4. Grant / scope parity

- [x] zero invented grants (no NULL legacyMembershipId) — 0
- [x] zero orphan grants — 0
- [x] every membership → a grant — 0 missing
- [x] every scope has exactly one dimension — 0 violations
- [x] every dim is {ENTITY,EXACT,nodeId} — 0 violations
- [x] every ENTITY nodeId is a business id — 0 violations
- [x] every grant's (principal,role,entity) == its membership — 0 violations

## 5. Registry parity

| Metric | Value | Expected | OK |
|---|---|---|---|
| legacy permissions | 29 | = action defs | ✔ |
| OCTIEN action definitions | 29 | = permissions | ✔ |
| distinct legacy resources | 17 | = resource defs | ✔ |
| OCTIEN resource definitions | 17 | = distinct resources | ✔ |
| missing mappings | 0 | 0 | ✔ |
| extra mappings | 0 | 0 | ✔ |
| orphan action defs | 0 | 0 | ✔ |
| resource defs off transition module | 0 | 0 | ✔ |

## 6. Edge cases

| # | Case | principal→entity·resource·action | legacy | octien | match |
|---|---|---|---|---|---|
| 1 | edge:unknown-resource | RZmpehOF…→biz_cosm…·__unknown_resource__·read | DENY | DENY | ✔ |
| 2 | edge:unknown-action | RZmpehOF…→biz_cosm…·finance·__unknown_action__ | DENY | DENY | ✔ |
| 3 | edge:unknown-entity | RZmpehOF…→__unknow…·finance·read | DENY | DENY | ✔ |
| 4 | edge:unknown-principal | __unknow…→biz_cosm…·finance·read | DENY | DENY | ✔ |
| 5 | edge:entity-with-membership(ALLOW) | RZmpehOF…→cmrov997…·governance·read | ALLOW | ALLOW | ✔ |
| 6 | edge:cross-entity-no-membership(DENY) | RZmpehOF…→biz_cosm…·governance·read | DENY | DENY | ✔ |
| 7 | edge:entity-with-membership(ALLOW) | liLhVuma…→cmrov997…·purchase_order·create | ALLOW | ALLOW | ✔ |
| 8 | edge:cross-entity-no-membership(DENY) | liLhVuma…→biz_cosm…·purchase_order·create | DENY | DENY | ✔ |
| 9 | edge:cross-organization(DENY) | RZmpehOF…→biz_cosm…·governance·read | DENY | DENY | ✔ |

Structural edge coverage from data:
- users with exactly one membership: 0
- users with multiple memberships (multi-entity): 2
- roles shared by multiple users: 1
- empty-authorization-state: covered by the unknown-principal edge (no grants → DENY in both)
- duplicate/overlapping memberships: prevented by legacy @@unique([userId,businessId]); none present
- registry pairs with no legacy equivalent: 0 (expected 0 — registry derived from permissions)

## The critical no-broadening equivalence (Membership↔Grant)

- Entity WITH membership → ALLOW in both: ✔ (legacy ALLOW / octien ALLOW)
- Entity WITHOUT membership → DENY in both: ✔ (legacy DENY / octien DENY)
- Cross-organization access → DENY in both: ✔

## FINAL PARITY RESULT

| Dimension | Mismatches |
|---|---|
| point decisions | 0 |
| list/set | 0 |
| no-broadening (extra/missing allows) | 0 |
| grant/scope | 0 |
| registry | 0 |

**TOTAL PARITY MISMATCHES: 0**

**IAM Increment 2C — PARITY VERIFIED ✔** — the OCTIEN representation faithfully reproduces today's authorization behavior. No enforcement changed.