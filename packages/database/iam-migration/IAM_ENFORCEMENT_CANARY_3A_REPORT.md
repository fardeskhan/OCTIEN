# OCTIEN IAM — Increment 3A: Permission Engine Enforcement Canary Report

**Status:** COMPLETE. The OCTIEN engine can now participate authoritatively — but ONLY for a flag-gated
tiny cohort, ONLY in agreement with legacy (mismatch/error ⇒ legacy), so it can never lock a user out.
Delivered state has all flags OFF (inert). **TEMPORARY** migration instrument (removed after cutover).

## Architecture (safe canary)

```
requirePermission → legacyDecision (authoritative baseline)
                  → if principal ∈ canary cohort:
                        octien = engine.decide(cached snapshot)         (awaited — real cost)
                        final  = reconcile(legacy, octien)              (enforcement-core, pure)
                  → enforce `final`
reconcile: agree → that decision · mismatch → legacy · octien error → legacy
```
The final enforced decision therefore **always equals legacy** during the canary (`finalDivergedFromLegacy`
must stay 0). Purpose: exercise the authoritative code path end-to-end, measure its overhead, collect
telemetry — with zero behavioural risk.

## What was added

- `apps/frontend/src/lib/iam/snapshot.ts` — shared, once-per-request (`React cache()`) authorization
  snapshot loader (extracted so shadow + enforcement share one build).
- `apps/frontend/src/lib/iam/enforcement-core.ts` — pure `reconcile(legacy, octien)` (no imports).
- `apps/frontend/src/lib/iam/enforcement.ts` — cohort gating + `enforceDecision()` (loads snapshot,
  runs engine, reconciles, records telemetry). Never throws — errors fall back to legacy.
- `apps/frontend/src/lib/server-auth.ts` — `requirePermission` runs the canary for cohort principals,
  enforces `final`, and a belt-and-suspenders `try/catch` falls back to legacy on any unexpected throw.

## Controls (default OFF ⇒ inert)

| Env | Effect |
|---|---|
| `IAM_ENFORCEMENT=1` | master switch |
| `IAM_ENFORCEMENT_PRINCIPALS=a,b` | explicit tiny cohort (preferred) |
| `IAM_ENFORCEMENT_SAMPLE=x` | [0,1] fraction, used only if no allowlist |

## Fixture verification (no DB, no production data) — 22/22 ✔

- **reconcile truth table:** agree→that decision; mismatch→legacy (flagged); octien-error→legacy. ✔
- **Restricted Marketing employee through the real engine + reconcile:** ALLOW customer.read / lead.create /
  campaign.read @ Salam Cola; **DENY** invoice.read (Finance), inventory.adjust, employee.manage (HR),
  payroll.read, and customer.read @ COSMY UCO (other entity). Under the canary with a correct legacy the
  final decision matches → the restriction is enforced. ✔
- **Lockout-safety:** if legacy erroneously ALLOWed a Finance action OCTIEN denies, the safe canary yields
  final=ALLOW (no lockout) with `fallbackReason="mismatch"` (divergence flagged). ✔

## Live canary (owner cohort of one; then flag removed)

Enabled `IAM_ENFORCEMENT=1` + `IAM_ENFORCEMENT_PRINCIPALS=<owner id>`, signed in, navigated real pages:

```
requests: 3   matrix: ALLOW/ALLOW 3 · DENY/DENY 0 · ALLOW/DENY 0 · DENY/ALLOW 0
mismatches: 0   errors: 0   fallbacks: {mismatch 0, octien-error 0}
finalDivergedFromLegacy: 0     ← SAFETY INVARIANT HELD (outcome never differed from legacy)
principalClass: owner 3
engine decision latency:  p50 0 · p95 1 · p99 1 · max 1 ms
snapshot load latency:    p50 ~2712 · p95/p99 ~3333 · max ~3333 ms   (SYNCHRONOUS now)
total auth overhead:      p50 ~2712 · max ~3334 ms
```
Per-request: procurement/sales/inventory `.read` → `legacy=ALLOW, octien=ALLOW, final=ALLOW,
fallbackReason=null`, `decideMs 0–1`. Pages rendered normally throughout.

## The decisive finding — DO NOT EXPAND THE CANARY YET

The engine is effectively free (**p99 = 1 ms**), but on the **authoritative (synchronous) path** the
per-request snapshot load is **~2–3.3 s** (Neon connection/round-trip, not query cost). Per the 2F/3A
rule, this is a **hard gate**: the canary must **not** be expanded until the authorization data-loading
strategy is optimized. The load-once-per-request cache already collapses N checks to one build; the
remaining cost is the single Neon snapshot. **Next optimization gate (before expanding the canary):**
warm/pooled Neon reads to remove connection latency, and a short-TTL cache for near-static registry +
role→permission data (invalidated on IAM writes), targeting low-single-digit-ms total overhead.

## Restricted principal before expanding (per your requirement)

A real non-owner restricted employee does not exist in the pilot, and we did **not** create one (that
would modify production authorization data without approval). The restricted-employee behaviour is
verified via the fixture above (engine + canary reconciliation). Before the canary is expanded beyond a
single owner, a controlled restricted test principal/fixture — matching Salam Cola → Pune → Marketing →
Sales/CRM/Marketing with explicit denial of Finance/Inventory/HR/Payroll/other-entity/other-city — must
be exercised through the live enforcement path.

## Gates & delivered state

`tsc` 0 · `eslint src/lib/iam` + `server-auth.ts` 0 · production build EXIT 0. `IAM_ENFORCEMENT` and
`IAM_SHADOW` unset everywhere ⇒ inert. No schema change, no backfill, no legacy-table change; Better Auth,
Admin UI, shell, and `reporting_executive_dashboard` untouched.

## Not included (each needs separate approval)

Snapshot performance optimization (the immediate next gate) · expanding the canary · OCTIEN-authoritative
override on mismatch · Better Auth bridge · Admin IAM UI · geographic/department/field UIs · fine-grained
scopes · removal of legacy tables / Membership · global cutover · new industry modules · dashboard drift.

## Recommended next step

**Snapshot performance hardening** (the optimization gate this canary surfaced) — warm/pooled reads +
short-TTL near-static caches — re-measure authoritative overhead, and only then expand the canary (with a
restricted test principal). After that: **3B Better Auth ↔ OCTIEN identity bridge**.
