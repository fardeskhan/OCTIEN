# OCTIEN IAM — Increment 2E: In-Request Shadow Instrumentation Report

**Status:** COMPLETE & VERIFIED. Legacy authorization remains authoritative; the OCTIEN engine runs
beside it in **observe-only** mode. This is a **temporary migration instrument** with a planned removal
after cutover — not permanent platform infrastructure.

## What was added

- `apps/frontend/src/lib/iam/shadow.ts` — the shadow instrument: builds a read-only `AuthzSnapshot` for
  the acting principal, runs the OCTIEN Permission Engine (`decide`), compares to the legacy decision,
  and emits log-only diagnostics.
- `apps/frontend/src/lib/server-auth.ts` — `requirePermission()` now computes the legacy decision
  explicitly (behaviour **identical** to before: Owner/Super-Admin bypass, else `permissions.includes`),
  fires the shadow **non-blocking** when enabled, then enforces the **legacy** decision unchanged.

`requirePermission` is the single central enforcement chokepoint — **148 call sites across 107 files**
(every server action + page guard) — so one instrumentation point observes all real permission traffic.

## Controls (temporary instrument lifecycle)

| Control | Behaviour |
|---|---|
| `IAM_SHADOW=1` | Kill switch. Unset/≠"1" (the delivered default) ⇒ **fully inert**: no queries, no logs, no overhead. |
| `IAM_SHADOW_SAMPLE=x` | Sampling rate [0,1], default 1. Start low in production, raise deliberately. |
| Fail-open | Any instrument error is swallowed; the request's legacy decision is never affected. |
| Non-blocking | Called `void shadowObserve(...).catch(()=>{})`; latency (`snapshotMs`/`decideMs`) is measured separately and never added to the request path. |
| Telemetry minimum | Opaque ids + decisions + latency only. **No** passwords/tokens/session data, **no** personal data (emails/names), **no** record contents. |
| Read-only | Snapshot built with Prisma reads; the instrument performs no writes. |

**Removal after cutover:** delete `shadow.ts`, the `shadowObserve` call + `IAM_SHADOW` guard in
`server-auth.ts`, and the env flags.

## The super-admin bypass — why in-request shadow matters

The 2C/2D harnesses modelled legacy as `role_permissions` only. The **real** runtime `requirePermission`
has an Owner/Super-Admin **bypass** (`isSuperAdmin` → allow-all) that those models did not include. This
increment compares against that real runtime. Data check: two roles exist — `OWNER` (0 permissions,
bypass-only, **unused** by any membership) and `Owner` (29 permissions, **complete**, used by all 4
memberships). Because the used role's `role_permissions` is complete, the engine (role-permission based)
reproduces the bypass result for every registered permission ⇒ parity holds. (A future note: the engine
does not model an unconditional super-admin bypass; for **unregistered** permission strings an Owner would
be allowed by legacy but denied by the engine — not reachable in real traffic, where only registered
permissions are requested. Flagged, not "fixed".)

## Verification (live pilot, flag temporarily enabled, then removed)

Signed in as `owner@cosmy.ai`, navigated real dashboard pages; the instrument fired in-request:

| # | resource.action | entity | legacy | octien | match | decideMs |
|---|---|---|---|---|---|---|
| 1 | procurement.read | (COSMY UCO) | ALLOW | ALLOW | ✔ | 0 |
| 2 | sales.read | (COSMY UCO) | ALLOW | ALLOW | ✔ | 0 |
| 3 | inventory.read | (COSMY UCO) | ALLOW | ALLOW | ✔ | 0 |

- **totals: total 3 · matches 3 · mismatches 0** · `iam-shadow-error`: **none**.
- `decideMs = 0` (engine evaluation is instant). `snapshotMs ≈ 2.5–4.2s` reflects cold Neon connection
  latency for the read-only snapshot batch; it is measured separately and, being non-blocking, is **not**
  added to the request. (A short-TTL per-principal snapshot cache would cut this if sampling is raised.)
- Pages rendered normally throughout — legacy remained authoritative; the shadow never altered a decision.

Gates: `tsc` 0 · `eslint src/lib/iam` + `server-auth.ts` 0 · production build EXIT 0. Delivered state has
`IAM_SHADOW` unset everywhere (instrument inert).

## The most important metric

**SHADOW MISMATCHES = 0** over the observed in-request traffic.

## What was NOT done (each needs separate explicit approval)

Enforcement (engine deciding requests) · Better Auth → OCTIEN identity bridge · Admin IAM UI · fine-grained
scopes (Location/Department/Team/Project/Module/Resource/Record/Field) · cutover · soak · legacy contract.
No schema change, no backfill, no legacy-table change, `reporting_executive_dashboard` untouched.

## Recommended next step

**2F — Shadow soak / production verification:** enable the flag at a low sample in the real environment for
a bounded window, accumulate mismatch telemetry over genuine multi-user traffic, and confirm
`SHADOW MISMATCHES = 0` at scale before any enforcement work (3A).
