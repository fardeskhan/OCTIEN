# OCTIEN IAM — Increment 2F: Shadow Soak / Production Verification Report

**Status:** COMPLETE (controlled in-session soak) + operator runbook for the real production soak.
Legacy authorization remained the **only** authoritative decision throughout. The shadow is a
**temporary migration instrument** (flag `IAM_SHADOW`, default OFF; removed after cutover).

## What was added (on top of 2E)

- `apps/frontend/src/lib/iam/shadow.ts` — upgraded from per-request logging to a **rolling soak
  aggregate**: a legacy-vs-OCTIEN confusion matrix, **classified** mismatch counts, error counts, and
  engine/snapshot latency **percentiles (p50/p95/p99/max)**. Exposed via a per-request `iam-shadow-soak`
  log line and `shadowSoakSummary()`. Error logging now captures `name`/`code`/`message` for diagnosis.
- `apps/frontend/src/lib/server-auth.ts` — `requirePermission` now also passes `superAdmin` so the soak
  can classify whether a divergence stems from the legacy Owner/Super-Admin bypass.

All 2E guarantees preserved: flag-gated (default OFF ⇒ inert), sampled, fail-open, non-blocking,
read-only, minimal non-sensitive telemetry.

## Controlled in-session soak result

Enabled `IAM_SHADOW=1` (sample = 1 to maximise signal from limited in-session traffic), signed in as an
Owner, and drove real dashboard traffic through the `requirePermission` chokepoint.

```
requests (successful comparisons) : 12
confusion matrix                  : ALLOW/ALLOW 12 · DENY/DENY 0 · ALLOW/DENY 0 · DENY/ALLOW 0
mismatches                        : 0
super-admin ALLOWs observed       : 12   (every request came via the Owner bypass)
shadow errors (fail-open)         : 2    (see "Errors" below)
mismatch classification           : identity 0 · entity-scope 0 · permission 0 · registry 0
                                    · super-admin 0 · unknown-resource-action 0 · engine-error (2)
engine decision latency (ms)      : p50 0 · p95 1 · p99 1 · max 1
snapshot build latency (ms)       : p50 ~1480 · p95 ~2525 · p99 ~2525 · max ~2525
```

**SHADOW MISMATCHES = 0** over the observed in-request traffic.

### Nature of the pilot traffic (honest scope)

The pilot has **two users, both `Owner`** (the complete 29-permission role). Real traffic is therefore
**ALLOW-dominated**; genuine DENY/DENY and DENY/ALLOW cells are not reachable from these users. Those
were already proven exhaustively in **2C** (174-tuple matrix incl. all DENY paths) and **2D** (engine
over the same matrix). 2F confirms the engine reproduces legacy **in the live request path** — it is not
a substitute for the 2C/2D completeness proof. A true multi-day, multi-user production soak (runbook
below) is the operator step that accumulates volume at scale.

## Investigation 1 — the super-admin bypass (per your instruction: observe, do not "fix")

Every one of the 12 requests was an Owner ALLOW **via the legacy bypass** (`superAdminAllows = 12`), and
the OCTIEN engine matched **all 12** (`super-admin` mismatch class = **0**). The engine reproduced the
bypass result purely from `role_permissions`, because the only role used by memberships (`Owner`) has the
**complete** 29-permission set.

**Conclusion:** in this dataset the divergent case (Owner requesting an *unregistered* permission, where
legacy would bypass-allow but the engine's registry gate would deny) is **not reachable** — real traffic
only requests registered permissions. Per your rule, this is documented as an **unreachable legacy edge
case**, not silently fixed. **Before enforcement (3A)** the OCTIEN model should still decide *how* to
represent super-admin intent explicitly (an owner-scoped wildcard grant, or an engine-level org-owner
capability) rather than relying on `role_permissions` completeness — but that is a 3A design decision, not
a 2F change.

## Investigation 2 — snapshot latency & the production data-loading strategy

```
engine decision : p99 = 1 ms      → the engine itself is effectively free
snapshot build  : p50 ≈ 1.5 s, max ≈ 2.5 s   → rebuilding the auth snapshot from Neon per call is the cost
```

This is harmless today (shadow is non-blocking and off the request path), but it is a **hard blocker for
enforcement**: an authoritative engine cannot add a ~1.5 s Neon snapshot to every authorized request.
Measured, not yet optimized — the required production data-loading strategy for 3A is:

- **Per-request principal cache** — resolve a principal's grants/scopes once per request (the app already
  resolves `requireBusinessContext` per request; the engine snapshot should ride on the same resolution),
  not per `requirePermission` call (a page can make many).
- **Warm, connection-pooled reads** — the latency is Neon serverless connection/round-trip, not query
  cost; a warmed pool / co-located reads collapse it.
- **Scoped snapshot** — load only the acting principal's grants + referenced roles/scopes + the registry
  (already the case), and consider a short-TTL in-memory registry/role-permission cache (near-static data)
  invalidated on IAM writes.
- **Target:** engine authorization overhead per request in the low-single-digit-ms range before 3A.

## Errors (fail-open behaviour, correctly demonstrated)

2 shadow errors occurred — induced by an **artificial parallel burst** that saturated Neon serverless
connections during traffic generation. The instrument **failed open**: the affected requests continued on
the legacy decision and the pages rendered normally; only an `iam-shadow-error` line was emitted. The
messages were empty (connection-layer failure); error logging has since been upgraded to capture
`name`/`code` so the production soak can classify these. **This is a key soak finding:** the snapshot's
DB dependency is a fragility point under load — reinforcing Investigation 2's data-loading requirement
before the engine becomes authoritative.

## Gates & delivered state

`tsc` 0 · `eslint src/lib/iam` + `server-auth.ts` 0 · production build EXIT 0. `IAM_SHADOW` is unset
everywhere in the delivered state ⇒ the instrument is inert. Verification enabled the flag via a
temporary `apps/frontend/.env.local` that was then removed. No schema change, no backfill, no legacy
authorization change; `reporting_executive_dashboard` untouched.

## Operator runbook — the real production soak

1. Set `IAM_SHADOW=1` and a **low** `IAM_SHADOW_SAMPLE` (e.g. `0.05`) in the real environment.
2. Observe for a **bounded window** across genuine multi-user traffic.
3. Collect the `iam-shadow-soak` aggregate (and any `iam-shadow-error` lines) from logs.
4. Success criteria before considering 3A:
   - `mismatches = 0` (or every mismatch explained & classified — especially **super-admin = 0**),
   - shadow **error rate** acceptable and understood,
   - engine `p99` low, and a **data-loading strategy** in place so snapshot latency is not on the
     enforced path,
   - no security regressions.
5. Raise the sample deliberately only if clean. Then seek approval for **3A (canary enforcement)** — never
   a global cutover.

## Not done (each needs separate explicit approval)

3A Permission Engine enforcement (canary) · 3B Better Auth → OCTIEN identity bridge · 3C Admin IAM UI ·
3D fine-grained scopes · 3E security/perf verification · 3F cutover · 3G soak · 3H legacy contract.
