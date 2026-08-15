import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  loadAuthSnapshot,
  buildAuthSnapshotUncached,
  invalidateNearStatic,
  resolvePair,
} from "@/lib/iam/snapshot";
import { decide } from "@/lib/iam/permission-engine";

/**
 * IAM Increment 3A-P2 — Authorization snapshot performance verification (READ-ONLY, gated).
 *
 * Runs the REAL optimized `loadAuthSnapshot` / `buildAuthSnapshotUncached` + engine `decide` in this
 * runtime and reports cold / warm / repeated-in-request / concurrent latency percentiles + the engine
 * decision latency and total overhead, evaluated against the ≤50ms p95 warm gate. Deploy this branch
 * to a production-representative environment (e.g. a Vercel preview co-located with Neon), set
 * `IAM_PERF=1`, and GET this route to obtain the production numbers. Measurement only — no writes, no
 * authorization behaviour change; disabled unless `IAM_PERF=1`.
 *
 * Query params (optional): ?warm=25&conc=10&engine=2000&repeat=5
 * Removal: delete this route with the shadow/enforcement instruments after cutover.
 */
export const dynamic = "force-dynamic";

const WARM_GATE_P95_MS = 50;

function pct(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
const band = (arr: number[]) => ({
  p50: pct(arr, 50), p95: pct(arr, 95), p99: pct(arr, 99),
  max: arr.length ? Math.max(...arr) : 0, n: arr.length,
});
const nowMs = () => performance.now();

export async function GET(req: Request) {
  if (process.env.IAM_PERF !== "1") {
    return NextResponse.json({ error: "disabled (set IAM_PERF=1)" }, { status: 404 });
  }

  const url = new URL(req.url);
  const WARM = Math.min(200, Math.max(1, Number(url.searchParams.get("warm") ?? "25")));
  const CONC = Math.min(50, Math.max(1, Number(url.searchParams.get("conc") ?? "10")));
  const ENGINE = Math.min(20000, Math.max(1, Number(url.searchParams.get("engine") ?? "2000")));
  const REPEAT = Math.min(50, Math.max(1, Number(url.searchParams.get("repeat") ?? "5")));

  // Read-only: pick a real principal to measure against.
  const principal = await db.principal.findFirst({ select: { id: true } });
  if (!principal) return NextResponse.json({ error: "no principals" }, { status: 200 });
  const userId = principal.id;

  // ---- COLD: near-static cache empty ----
  invalidateNearStatic();
  let t = nowMs();
  const first = await buildAuthSnapshotUncached(userId);
  const coldMs = nowMs() - t;

  // A registered permission + a valid entity to exercise the engine.
  const someEntity = [...first.snapshot.entities][0] ?? "";
  const someRegistered = [...first.snapshot.registryActions][0] ?? "customer|read";
  const [rRes, rAct] = someRegistered.split("|");

  // ---- WARM: near-static cached, each build = one request-specific query ----
  const warm: number[] = [];
  for (let i = 0; i < WARM; i++) {
    t = nowMs();
    await buildAuthSnapshotUncached(userId);
    warm.push(nowMs() - t);
  }

  // ---- REPEATED in ONE request: React cache() ⇒ 1 build + (REPEAT-1) cache hits ----
  const repeated: number[] = [];
  for (let i = 0; i < REPEAT; i++) {
    t = nowMs();
    await loadAuthSnapshot(userId);
    repeated.push(nowMs() - t);
  }

  // ---- CONCURRENT: independent builds in parallel (cold near-static, then contention) ----
  invalidateNearStatic();
  const cStart = nowMs();
  const concPer = await Promise.all(
    Array.from({ length: CONC }, async () => {
      const s = nowMs();
      await buildAuthSnapshotUncached(userId);
      return nowMs() - s;
    }),
  );
  const concurrentWallMs = nowMs() - cStart;

  // ---- ENGINE: pure decide() over an in-memory snapshot ----
  const { snapshot } = first;
  const eng: number[] = [];
  for (let i = 0; i < ENGINE; i++) {
    t = nowMs();
    decide(snapshot, userId, someEntity, rRes, rAct);
    eng.push(nowMs() - t);
  }

  // ---- total requirePermission()-equivalent overhead (warm snapshot + one decide) ----
  const dottedPair = resolvePair(first.dotted, `${rRes}.${rAct}`);
  const totalWarm: number[] = [];
  for (let i = 0; i < WARM; i++) {
    t = nowMs();
    const { snapshot: sn } = await buildAuthSnapshotUncached(userId);
    decide(sn, userId, someEntity, dottedPair.resource, dottedPair.action);
    totalWarm.push(nowMs() - t);
  }

  const warmBand = band(warm);
  const gatePass = warmBand.p95 <= WARM_GATE_P95_MS;

  return NextResponse.json({
    tag: "iam-perf-3ap2",
    env: { vercel: process.env.VERCEL === "1", vercelRegion: process.env.VERCEL_REGION ?? null, node: process.version },
    params: { warm: WARM, conc: CONC, engine: ENGINE, repeat: REPEAT },
    principal: userId.slice(0, 8) + "…",
    coldMs,
    warmSnapshotMs: warmBand,
    repeatedInRequestMs: band(repeated),
    concurrent: { requests: CONC, wallMs: concurrentWallMs, perLoadMs: band(concPer) },
    engineDecisionMs: band(eng),
    totalOverheadMs: band(totalWarm),
    gate: { target: `warm snapshot p95 ≤ ${WARM_GATE_P95_MS} ms`, warmP95Ms: warmBand.p95, result: gatePass ? "PASS" : "FAIL" },
    note: "Run on a production-representative deployment (Vercel co-located with Neon). Local/dev numbers are dominated by dev→Neon network latency and are NOT the gate.",
  });
}
