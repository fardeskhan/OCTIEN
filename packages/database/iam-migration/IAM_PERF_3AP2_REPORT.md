# OCTIEN IAM — Increment 3A-P2: Production-Representative Authorization Verification

**Status:** Instrument built + validated locally; **production numbers pending operator execution** (this
session runs in local dev and cannot deploy to / measure from Vercel). Measurement only — no new
authorization behaviour. All IAM flags (`IAM_ENFORCEMENT`, `IAM_SHADOW`, `IAM_PERF`) OFF in the delivered
state; legacy authoritative; no schema/data change.

## What was added

- **`apps/frontend/src/app/api/dev/iam-perf/route.ts`** — a gated, READ-ONLY measurement endpoint that
  runs the **real** optimized `loadAuthSnapshot` / `buildAuthSnapshotUncached` + engine `decide` in the
  deployed runtime and reports cold / warm / repeated-in-request / concurrent latency percentiles, engine
  decision latency, and total overhead — evaluated against the **≤ 50 ms p95 warm** gate. Disabled unless
  `IAM_PERF=1` (off by default, so no new surface in normal operation). No writes; no sensitive data
  (only latencies + a truncated principal id + Vercel region).
- **`apps/frontend/src/lib/iam/snapshot.ts`** — exported `buildAuthSnapshotUncached` so the endpoint can
  deliberately exercise cold/warm/concurrent builds (the per-request `cache()` would otherwise dedupe).

The endpoint reports `env.vercel` / `env.vercelRegion` so the collected numbers are self-labelling as
production-representative or not.

## Local validation (dev machine → Neon us-east-1; NOT the gate)

`GET /api/dev/iam-perf?warm=25&conc=8&engine=2000&repeat=5`:

```
coldMs (near-static cache fill): 2870
warm snapshot ms: p50 314 · p95 412 · p99 861            ← one request-specific query × ~300–400 ms dev RTT
engine decision ms: p50 0.0006 · p95 0.0015 · p99 0.0023 · max 0.23   ← SUB-MICROSECOND (essentially free)
total overhead ms (snapshot+decide): p50 262 · p95 341 · p99 449
concurrent(8): wall 3745 ms · per-load p95 3744 ms       ← 8 parallel COLD builds contend on cache-fill + pool
gate (warm p95 ≤ 50 ms): FAIL (412 ms)                   ← EXPECTED on dev; network-dominated, not the gate
```

**Interpretation:** the instrument is correct and complete. The engine is confirmed sub-microsecond. The
warm snapshot cost is exactly **one query × RTT** — 412 ms p95 here because dev→us-east-1 RTT is ~300–400
ms. In a production-representative environment (Vercel co-located with Neon, RTT ~1–5 ms) the same single
query should put warm p95 in the low-single-digit ms, meeting the gate — **but that must be measured, not
assumed** (which is the whole point of this increment).

Caveat: `repeatedInRequest` measured via a Route Handler does not reflect React `cache()` per-request
deduplication (route handlers may lack the RSC request-cache scope). The gate-relevant metric is **warm
per-call snapshot cost**, which is measured reliably. The per-request `cache()` dedup applies in RSC page
renders (the real `requirePermission` path) as an additional saving on top.

## Gates & delivered state

`tsc` 0 · `eslint src/lib/iam` + endpoint 0 · production build EXIT 0. All IAM flags unset ⇒ inert.

## Operator runbook — run the REAL production-representative measurement

1. Deploy this branch to a **Vercel preview** (same infra/region as production, co-located with Neon
   us-east-1). Do **not** enable enforcement.
2. On that deployment set env `IAM_PERF=1` (and nothing else IAM-related).
3. `GET https://<preview>/api/dev/iam-perf?warm=50&conc=10&engine=5000&repeat=5` (repeat a few times so the
   near-static cache is warm; also hit it concurrently from a couple of clients for the concurrent picture).
4. Record the JSON. Confirm `env.vercel = true` and a `vercelRegion` co-located with the DB.
5. **Gate (hard):** `gate.result == "PASS"` (warm snapshot **p95 ≤ 50 ms**), engine p99 ≤ 2 ms, cold-fill
   acceptable, concurrent per-load acceptable.
6. After measuring, **unset `IAM_PERF`** (disable the endpoint).

## Decision gate

- **PASS** → proceed to the restricted-principal live canary (a controlled non-owner test principal:
  COSMY → Salam Cola → India/Maharashtra/Pune → Marketing, ALLOW Sales/CRM/Marketing, DENY Finance/
  Inventory/HR/Payroll/other-entity), enforced only for that principal, retaining OCTIEN-mismatch→legacy
  and OCTIEN-error→legacy. Do **not** create that principal by modifying production authorization data
  without approval — configure a controlled test fixture/principal per the environment.
- **FAIL** → do not expand the canary; return to snapshot performance work (e.g. warm the near-static
  cache at process start, tune TTL, or reduce the request-specific query further) and re-measure.

## Not included (each needs separate approval)

Deploying/running the production measurement · expanding the canary · creating a restricted principal ·
OCTIEN-authoritative override on mismatch · Better Auth bridge · Admin IAM UI · fine-grained scopes ·
global cutover · dashboard drift.

## Recommended next step

Operator runs the endpoint on a production-representative Vercel preview and records the gate result. If
PASS, the **restricted-principal live canary** is the next increment. **3B Better Auth remains deferred** —
authentication is not the blocker; authorization latency + restricted-user behaviour must clear first.
