/**
 * OCTIEN IAM — In-request shadow instrument (Increments 2E/2F). TEMPORARY MIGRATION INSTRUMENT.
 *
 * Runs the OCTIEN Permission Engine BESIDE the legacy authorization decision, compares them, and
 * emits log-only diagnostics + a rolling soak aggregate (2F). It NEVER changes the ALLOW/DENY the
 * request enforces — legacy stays authoritative. Designed to be removed after cutover.
 *
 * Lifecycle & controls (env-driven; default OFF so this file is inert until explicitly enabled):
 *   - IAM_SHADOW=1          kill switch — unset/≠"1" ⇒ does nothing (no queries, no logs).
 *   - IAM_SHADOW_SAMPLE=x   sampling rate in [0,1] (default 1). Start low in production.
 *
 * Safety: fail-open (errors swallowed), non-blocking (callers fire-and-forget), latency measured
 * separately (never added to the request), telemetry minimum (opaque ids + decisions + latency;
 * NO passwords/tokens/session/personal data, NO record contents), read-only (Prisma reads only).
 *
 * Removal: delete this file, the `shadowObserve` call in server-auth.ts, and the env flags.
 */
import { decide, type Effect } from "./permission-engine";
import { loadAuthSnapshot, resolvePair } from "./snapshot";

const shadowEnabled = () => process.env.IAM_SHADOW === "1";
const sampleRate = () => {
  const v = Number(process.env.IAM_SHADOW_SAMPLE ?? "1");
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
};

// ---- Soak aggregate (2F): process-local; resets on restart ----
type MismatchClass =
  | "identity" | "entity-scope" | "permission" | "registry"
  | "super-admin" | "unknown-resource-action" | "engine-error" | "other";

const LAT_CAP = 5000;
const agg = {
  requests: 0,
  allowAllow: 0, denyDeny: 0, allowDeny: 0, denyAllow: 0,
  mismatches: 0, errors: 0, superAdminAllows: 0,
  byClass: {
    identity: 0, "entity-scope": 0, permission: 0, registry: 0,
    "super-admin": 0, "unknown-resource-action": 0, "engine-error": 0, other: 0,
  } as Record<MismatchClass, number>,
  engineLat: [] as number[],
  snapshotLat: [] as number[],
};

function pushLat(arr: number[], v: number) {
  arr.push(v);
  if (arr.length > LAT_CAP) arr.shift();
}
function pct(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
function classifyMismatch(legacy: Effect, octien: Effect, reason: string, superAdmin: boolean): MismatchClass {
  if (reason.startsWith("unknown-principal")) return "identity";
  if (reason.startsWith("unknown-entity")) return "entity-scope";
  if (reason.startsWith("unregistered-resource-action")) return superAdmin ? "super-admin" : "unknown-resource-action";
  if (reason.startsWith("no-matching-allow")) return superAdmin ? "super-admin" : "permission";
  if (reason.startsWith("explicit-deny")) return "permission";
  return "other";
}

/** Rolling soak summary — aggregate counts + latency percentiles. Non-sensitive. */
export function shadowSoakSummary() {
  return {
    requests: agg.requests,
    matrix: { allowAllow: agg.allowAllow, denyDeny: agg.denyDeny, allowDeny: agg.allowDeny, denyAllow: agg.denyAllow },
    mismatches: agg.mismatches,
    errors: agg.errors,
    superAdminAllows: agg.superAdminAllows,
    byClass: { ...agg.byClass },
    engineLatMs: { p50: pct(agg.engineLat, 50), p95: pct(agg.engineLat, 95), p99: pct(agg.engineLat, 99), max: agg.engineLat.length ? Math.max(...agg.engineLat) : 0 },
    snapshotLatMs: { p50: pct(agg.snapshotLat, 50), p95: pct(agg.snapshotLat, 95), p99: pct(agg.snapshotLat, 99), max: agg.snapshotLat.length ? Math.max(...agg.snapshotLat) : 0 },
  };
}

/**
 * Observe (do not enforce) one authorization decision. Flag-gated, sampled, fail-open, non-blocking.
 * `legacyDecision` is the authoritative result the request will actually use; `superAdmin` records
 * whether that ALLOW came via the Owner/Super-Admin bypass (for 2F mismatch classification).
 */
export async function shadowObserve(input: {
  userId: string;
  entityId: string;
  permissionString: string;
  legacyDecision: Effect;
  superAdmin: boolean;
}): Promise<void> {
  if (!shadowEnabled()) return;
  if (Math.random() > sampleRate()) return;
  try {
    // Load-once per request (cache hit ⇒ ~0ms); this measures the ACTUAL cost the request paid.
    const t0 = Date.now();
    const { snapshot, dotted } = await loadAuthSnapshot(input.userId);
    const buildMs = Date.now() - t0;
    const pair = resolvePair(dotted, input.permissionString);
    const t1 = Date.now();
    const res = decide(snapshot, input.userId, input.entityId, pair.resource, pair.action);
    const decideMs = Date.now() - t1;

    const legacy = input.legacyDecision;
    const octien = res.decision;
    const match = octien === legacy;

    agg.requests++;
    pushLat(agg.snapshotLat, buildMs);
    pushLat(agg.engineLat, decideMs);
    if (input.superAdmin && legacy === "ALLOW") agg.superAdminAllows++;
    if (legacy === "ALLOW" && octien === "ALLOW") agg.allowAllow++;
    else if (legacy === "DENY" && octien === "DENY") agg.denyDeny++;
    else if (legacy === "ALLOW" && octien === "DENY") agg.allowDeny++;
    else agg.denyAllow++;
    if (!match) {
      agg.mismatches++;
      agg.byClass[classifyMismatch(legacy, octien, res.reason, input.superAdmin)]++;
    }

    // Per-request line (minimal) + rolling soak summary line.
    console.log(JSON.stringify({
      tag: "iam-shadow", ts: new Date().toISOString(),
      principal: input.userId, entity: input.entityId, resource: pair.resource, action: pair.action,
      legacy, octien, match, mismatchReason: match ? null : res.reason,
      superAdmin: input.superAdmin, snapshotMs: buildMs, decideMs,
    }));
    console.log(JSON.stringify({ tag: "iam-shadow-soak", ...shadowSoakSummary() }));
  } catch (err) {
    agg.errors++;
    agg.byClass["engine-error"]++;
    const e = err as { name?: string; message?: string; code?: string } | undefined;
    console.log(
      JSON.stringify({
        tag: "iam-shadow-error",
        ts: new Date().toISOString(),
        name: e?.name ?? typeof err,
        code: e?.code ?? null,
        error: e?.message || String(err),
      }),
    );
  }
}
