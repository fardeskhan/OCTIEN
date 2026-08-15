/**
 * OCTIEN IAM — Enforcement Canary (Increment 3A). TEMPORARY MIGRATION INSTRUMENT.
 *
 * For a flag-gated **tiny cohort**, the OCTIEN Permission Engine participates in the authoritative
 * decision — but under the safe-canary rule (see enforcement-core): OCTIEN only agrees with legacy;
 * on mismatch or error the **legacy** decision stands, so no OCTIEN failure locks anyone out. The
 * final decision therefore never diverges from legacy during the canary. Purpose: exercise the real
 * authoritative code path end-to-end, measure its overhead, and collect telemetry — with zero
 * behavioural risk.
 *
 * Controls (default OFF ⇒ inert — no queries, no logs, cohort empty):
 *   IAM_ENFORCEMENT=1              master switch.
 *   IAM_ENFORCEMENT_PRINCIPALS=a,b comma-separated principal ids in the canary cohort (preferred — a
 *                                  tiny, explicit allowlist).
 *   IAM_ENFORCEMENT_SAMPLE=x       [0,1] fraction of requests, used only when no allowlist is set.
 *
 * Removal: delete this file, the enforcement block in server-auth.ts, and the env flags.
 */
import { decide, type Effect } from "./permission-engine";
import { loadAuthSnapshot, resolvePair } from "./snapshot";
import { reconcile, type FallbackReason } from "./enforcement-core";

const enforcementEnabled = () => process.env.IAM_ENFORCEMENT === "1";

function cohortPrincipals(): Set<string> {
  const raw = process.env.IAM_ENFORCEMENT_PRINCIPALS ?? "";
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}
function sampleRate(): number {
  const v = Number(process.env.IAM_ENFORCEMENT_SAMPLE ?? "0");
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

/** Is this principal in the enforcement canary cohort? Default: no (flag off / empty cohort). */
export function isInCanaryCohort(userId: string): boolean {
  if (!enforcementEnabled()) return false;
  const allow = cohortPrincipals();
  if (allow.size > 0) return allow.has(userId);
  return Math.random() < sampleRate();
}

// ---- Canary telemetry (process-local; resets on restart) ----
const LAT_CAP = 5000;
const agg = {
  requests: 0,
  // legacy × octien confusion (octien null ⇒ error, counted separately)
  allowAllow: 0, denyDeny: 0, allowDeny: 0, denyAllow: 0,
  mismatches: 0, errors: 0,
  finalDivergedFromLegacy: 0, // MUST stay 0 in the safe canary — the key safety invariant
  fallbackByReason: { mismatch: 0, "octien-error": 0 } as Record<Exclude<FallbackReason, null>, number>,
  byPrincipalClass: { owner: 0, restricted: 0 } as Record<"owner" | "restricted", number>,
  snapshotLat: [] as number[],
  engineLat: [] as number[],
  totalLat: [] as number[],
};
function pushLat(arr: number[], v: number) { arr.push(v); if (arr.length > LAT_CAP) arr.shift(); }
function pct(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
const band = (arr: number[]) => ({ p50: pct(arr, 50), p95: pct(arr, 95), p99: pct(arr, 99), max: arr.length ? Math.max(...arr) : 0 });

/** Rolling canary summary — confusion matrix, fallbacks, safety invariant, latency percentiles. */
export function enforcementSummary() {
  return {
    requests: agg.requests,
    matrix: { allowAllow: agg.allowAllow, denyDeny: agg.denyDeny, allowDeny: agg.allowDeny, denyAllow: agg.denyAllow },
    mismatches: agg.mismatches,
    errors: agg.errors,
    finalDivergedFromLegacy: agg.finalDivergedFromLegacy,
    fallbackByReason: { ...agg.fallbackByReason },
    byPrincipalClass: { ...agg.byPrincipalClass },
    snapshotLatMs: band(agg.snapshotLat),
    engineLatMs: band(agg.engineLat),
    totalOverheadMs: band(agg.totalLat),
  };
}

/**
 * Compute the FINAL enforced decision for a cohort request. Never throws — on any error it returns
 * the legacy decision (safe-canary fallback). Awaited by the caller, so this is the real
 * authoritative-path cost.
 */
export async function enforceDecision(input: {
  userId: string;
  entityId: string;
  permissionString: string;
  legacyDecision: Effect;
  superAdmin: boolean;
}): Promise<Effect> {
  const t0 = Date.now();
  let octien: Effect | null = null;
  let snapshotMs = 0;
  let decideMs = 0;
  let resource = "";
  let action = "";
  try {
    const s0 = Date.now();
    const { snapshot, dotted } = await loadAuthSnapshot(input.userId);
    snapshotMs = Date.now() - s0;
    const pair = resolvePair(dotted, input.permissionString);
    resource = pair.resource;
    action = pair.action;
    const d0 = Date.now();
    octien = decide(snapshot, input.userId, input.entityId, pair.resource, pair.action).decision;
    decideMs = Date.now() - d0;
  } catch (err) {
    octien = null; // reconcile → legacy fallback
    const e = err as { name?: string; message?: string; code?: string } | undefined;
    console.log(JSON.stringify({ tag: "iam-enforce-error", ts: new Date().toISOString(), name: e?.name ?? typeof err, code: e?.code ?? null, error: e?.message || String(err) }));
  }

  const { final, fallbackReason } = reconcile(input.legacyDecision, octien);
  const totalMs = Date.now() - t0;

  // ---- record ----
  agg.requests++;
  pushLat(agg.snapshotLat, snapshotMs);
  pushLat(agg.engineLat, decideMs);
  pushLat(agg.totalLat, totalMs);
  agg.byPrincipalClass[input.superAdmin ? "owner" : "restricted"]++;
  const legacy = input.legacyDecision;
  if (octien === null) agg.errors++;
  else if (legacy === "ALLOW" && octien === "ALLOW") agg.allowAllow++;
  else if (legacy === "DENY" && octien === "DENY") agg.denyDeny++;
  else if (legacy === "ALLOW" && octien === "DENY") agg.allowDeny++;
  else agg.denyAllow++;
  if (fallbackReason) agg.fallbackByReason[fallbackReason]++;
  if (fallbackReason === "mismatch") agg.mismatches++;
  if (final !== legacy) agg.finalDivergedFromLegacy++; // invariant: stays 0 in the safe canary

  console.log(JSON.stringify({
    tag: "iam-enforce", ts: new Date().toISOString(),
    principal: input.userId, principalClass: input.superAdmin ? "owner" : "restricted",
    entity: input.entityId, resource, action,
    legacy, octien, final, fallbackReason,
    snapshotMs, decideMs, totalMs,
  }));
  console.log(JSON.stringify({ tag: "iam-enforce-agg", ...enforcementSummary() }));

  return final;
}
