# OCTIEN IAM — Increment 3A-P: Authorization Snapshot Performance

**Status:** COMPLETE — measured → bottleneck identified → fix implemented → validated (correctness + latency).
`IAM_ENFORCEMENT`/`IAM_SHADOW` remain OFF in the delivered state; legacy authoritative; no schema change,
no production data change, no Admin UI, no Better Auth change.

## 1. Measurement (before) — where the ~2–3.3s went

Instrumented raw-driver benchmark (`benchmark_3ap.js`), this dev machine → Neon us-east-1:

```
connection acquisition (cold): 1432 ms   (one-time per NEW connection)
round-trip latency SELECT 1  : avg 395 ms   ← pure network distance (dev → us-east-1)
cold snapshot load           : 2272 ms  (batch1 1477 · batch2 795 · construct 0 · 8 queries)
WARM snapshot load           : 2170 ms  ← ≈ cold! reusing the connection barely helped
concurrent(5) wall           : 3138 ms
per-query (cold, serialized) : principals 316 · entities 640 · grants 924 · permissions 1205
                               · registry 1477 · scopeDims 249 · rolePerms 513 · roles 795
```

## 2. Bottleneck identified (not what a naive "add a cache" would assume)

- **Not connection acquisition:** warm (2170 ms) ≈ cold (2272 ms). Reusing the connection did not help.
- **Not query execution or construction:** construction 0 ms; queries are individually fast server-side.
- **It is round-trip COUNT × network latency.** The 8 queries **serialize** over a single Postgres
  connection (Promise.all does not parallelize on one connection), so the cost ≈ **8 × ~300–395 ms RTT**.
- **A large share is dev-geographic:** ~395 ms RTT is dev-machine → us-east-1. In production (Vercel
  co-located with Neon us-east-1) RTT is ~1–5 ms, so the same shape costs far less. **The transferable
  signal is round-trip COUNT, not the absolute ms.**

## 3. Fix (two independent levers, both applied to `snapshot.ts`)

1. **Near-static in-process cache (TTL).** Module registry, resources/actions, roles, role→permissions,
   and the principal/entity id sets change rarely → loaded once and cached for `IAM_SNAPSHOT_TTL_MS`
   (default 60 s), with `invalidateNearStatic()` to drop on IAM writes. Removes ~6 queries/request.
2. **Combined request-specific query.** A principal's grants + their scope dimensions load in **one**
   round-trip (`iam_grants LEFT JOIN iam_scope_dimensions`) instead of two. Validated equivalent to the
   two separate queries (same grant ids, same dimension rows) — measured **683 ms → 238 ms**.

Data separation preserved: **request-specific** = the principal's grants + scopes (fetched fresh every
request); **near-static** = everything org-wide (cached). Only the near-static half is cache-safe. The
per-request React `cache()` wrapper is preserved (all `requirePermission()` calls in a request share one
build). Net: **8 queries/request → 1** on a warm cache.

## 4. Validation (after) — live app, optimized loader

Enabled shadow + owner canary, navigated real pages:

```
enforce snapshotMs:  req1 (cold, fills cache) 2278 · req2 438 · req3 337     ← ~5–7× faster once warm
shadow soak:         3 requests · 0 mismatches · 0 errors                    ← correctness preserved
engine decideMs:     0                                                       ← engine still ~0 ms
final vs legacy:     final = legacy on every request (canary invariant held)
```

- **Correctness:** the optimized loader produces identical decisions (0 shadow mismatches).
- **Latency:** warm authoritative-path snapshot dropped from **~2170 ms → ~337–438 ms** on the dev
  machine; the residual ~337–438 ms is the **single** combined query's one round-trip (~395 ms RTT here).
- **Cold** (first request per TTL window) is ~2278 ms while the near-static cache fills — amortized across
  the TTL.

Gates: `tsc` 0 · `eslint src/lib/iam` 0 · production build EXIT 0.

## 5. Hard target (before expanding the canary)

- **Authoritative snapshot overhead ≤ 50 ms p95 (warm); engine ≤ 2 ms.** On the dev machine the warm path
  is ~337–438 ms — **one** round-trip dominated by the 395 ms dev→us-east-1 RTT. This target is expected
  to be met in a **production-representative** environment (Vercel co-located with Neon, RTT ~1–5 ms →
  warm ~1–5 ms), but it **must be re-measured there** before the canary is expanded. Cold-fill cost and
  TTL/invalidation behaviour under real multi-user traffic must also be validated.

## 6. Remaining considerations / open items

- **Near-static invalidation:** currently TTL-only (no IAM write path exists yet). When admin writes land
  (3C), call `invalidateNearStatic()` on role/permission/registry/principal/entity changes. Bounded
  staleness = TTL until then. Moot during the safe canary (legacy authoritative).
- **Multi-org:** the near-static cache is process-global (valid for the single-org pilot). For multi-org
  it must be keyed by organization id.
- **Cold-fill:** first request per TTL still pays the ~6 near-static queries. Options if needed: warm the
  cache at process start, or a longer TTL. Measure in production before optimizing further.

## 7. Not included (each needs separate approval)

Expanding the canary · production-representative re-measure sign-off · OCTIEN-authoritative override on
mismatch · Better Auth bridge · Admin IAM UI · fine-grained scopes · removal of legacy tables/Membership ·
global cutover · dashboard drift.

## Recommended next step

Re-measure this warm/cold path in a **production-representative** environment (co-located Vercel+Neon) to
ratify the ≤ 50 ms p95 target; then expand the canary with a controlled restricted test principal. Only
after that: **3B Better Auth ↔ OCTIEN identity bridge**.
