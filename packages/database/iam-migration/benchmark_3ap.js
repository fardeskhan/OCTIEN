/**
 * OCTIEN IAM — Increment 3A-P: Authorization snapshot performance MEASUREMENT (READ-ONLY).
 *
 * Breaks down where the ~2–3.3s snapshot load goes: connection acquisition, per-query round-trips,
 * the two Promise.all batch waves, and in-memory construction — across cold / warm / concurrent.
 * MEASUREMENT ONLY: no code change, no schema change, no writes. The result drives the fix design.
 *
 * Usage: NODE_PATH=<repo>/node_modules node packages/database/iam-migration/benchmark_3ap.js
 */
const fs = require("fs");
const path = require("path");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

const REPO = "D:/1/cosmyerp/COSMY-BOS";
const OUT = path.join(REPO, "packages/database/iam-migration/IAM_SNAPSHOT_PERF_3AP_REPORT.md");

function readDatabaseUrl() {
  const env = fs.readFileSync(path.join(REPO, ".env"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  let v = line.slice("DATABASE_URL=".length).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}
const now = () => Date.now();

// The 8 queries buildSnapshot runs, split into the same two Promise.all waves.
async function loadOnce(client, principalId, perQuery) {
  const t0 = now();

  const b1 = now();
  const q = async (label, sql, params) => { const t = now(); const r = await client.query(sql, params); if (perQuery) perQuery.push({ label, ms: now() - t }); return r; };
  const [principals, entities, grants, permissions, registry] = await Promise.all([
    q("principals", 'SELECT "id" FROM "iam_principals"'),
    q("entities", 'SELECT "id" FROM "iam_entities"'),
    q("grants", 'SELECT "id","principalId","roleId","scopeId","effect","state","startAt","endAt" FROM "iam_grants" WHERE "principalId"=$1', [principalId]),
    q("permissions", 'SELECT "resource","action" FROM "permissions"'),
    q("registry", 'SELECT rd."key" AS resource, ad."key" AS action FROM "iam_action_definitions" ad JOIN "iam_resource_definitions" rd ON rd."id"=ad."resourceDefId"'),
  ]);
  const batch1Ms = now() - b1;

  const scopeIds = [...new Set(grants.rows.map((g) => g.scopeId))];
  const roleIds = [...new Set(grants.rows.map((g) => g.roleId))];

  const b2 = now();
  const [dims, rperms, roles] = await Promise.all([
    scopeIds.length ? q("scopeDims", `SELECT "scopeId","dimension","nodeId","valueKey","mode" FROM "iam_scope_dimensions" WHERE "scopeId" = ANY($1)`, [scopeIds]) : Promise.resolve({ rows: [] }),
    roleIds.length ? q("rolePerms", `SELECT rp."roleId", p."resource", p."action" FROM "role_permissions" rp JOIN "permissions" p ON p."id"=rp."permissionId" WHERE rp."roleId" = ANY($1)`, [roleIds]) : Promise.resolve({ rows: [] }),
    roleIds.length ? q("roles", `SELECT "id","name" FROM "roles" WHERE "id" = ANY($1)`, [roleIds]) : Promise.resolve({ rows: [] }),
  ]);
  const batch2Ms = now() - b2;

  // In-memory construction (what the real buildSnapshot does after the queries).
  const c0 = now();
  const grantsByPrincipal = new Map([[principalId, grants.rows]]);
  const scopeDimsByScope = new Map();
  for (const d of dims.rows) { if (!scopeDimsByScope.has(d.scopeId)) scopeDimsByScope.set(d.scopeId, []); scopeDimsByScope.get(d.scopeId).push(d); }
  const rolePermissions = new Map();
  for (const rp of rperms.rows) { if (!rolePermissions.has(rp.roleId)) rolePermissions.set(rp.roleId, new Set()); rolePermissions.get(rp.roleId).add(`${rp.resource}|${rp.action}`); }
  const registryActions = new Set(registry.rows.map((r) => `${r.resource}|${r.action}`));
  const principalsSet = new Set(principals.rows.map((r) => r.id));
  const entitiesSet = new Set(entities.rows.map((r) => r.id));
  void grantsByPrincipal; void principalsSet; void entitiesSet; void registryActions;
  const constructMs = now() - c0;

  return { totalMs: now() - t0, batch1Ms, batch2Ms, constructMs, queries: 8 };
}

const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const mx = (xs) => (xs.length ? Math.max(...xs) : 0);

async function main() {
  const url = readDatabaseUrl();
  const hostRedacted = (url.match(/@([^/:?]+)/) || [null, "unknown"])[1];
  const L = []; const log = (s = "") => L.push(s);

  // ---- COLD: fresh pool + connection ----
  const pool = new Pool({ connectionString: url });
  const tConn = now();
  const client = await pool.connect();
  const connectMs = now() - tConn;

  // pure round-trip latency (SELECT 1) x5
  const rtts = [];
  for (let i = 0; i < 5; i++) { const t = now(); await client.query("SELECT 1"); rtts.push(now() - t); }

  // cold snapshot load (first load on a fresh connection), with per-query timing
  const pid = (await client.query('SELECT "id" FROM "iam_principals" LIMIT 1')).rows[0].id;
  const perQ = [];
  const cold = await loadOnce(client, pid, perQ);

  // ---- WARM: same client, repeated loads ----
  const warm = [];
  for (let i = 0; i < 5; i++) warm.push(await loadOnce(client, pid));
  const warmTotals = warm.map((w) => w.totalMs);
  const warmB1 = warm.map((w) => w.batch1Ms);
  const warmB2 = warm.map((w) => w.batch2Ms);
  const warmConstruct = warm.map((w) => w.constructMs);

  client.release();

  // ---- MULTIPLE requirePermission() in one request: with React cache() only ONE load happens.
  //      Without cache it would be N loads. Model both from warm numbers.
  const warmAvg = avg(warmTotals);

  // ---- CONCURRENT: N parallel loads via the pool (separate connections) ----
  const concN = 5;
  const cStart = now();
  const concResults = await Promise.all(Array.from({ length: concN }, () => (async () => { const c = await pool.connect(); try { return await loadOnce(c, pid); } finally { c.release(); } })()));
  const concWallMs = now() - cStart;
  const concTotals = concResults.map((r) => r.totalMs);

  await pool.end();

  // ---- report ----
  log("# OCTIEN IAM — 3A-P Authorization Snapshot Performance (measurement)\n");
  log(`> READ-ONLY breakdown of the snapshot-load cost that gates canary expansion. No code/schema change.`);
  log(`> Generated: ${new Date().toISOString()} · DB \`${hostRedacted}\` (raw Neon serverless driver; dev machine → Neon).`);
  log(`> Caveat: measured from the dev machine. Production (Vercel co-located with Neon us-east-1) will have`);
  log(`> far lower per-round-trip latency; the *shape* of the breakdown is the transferable signal, not the`);
  log(`> absolute ms. A production-representative re-measure is required before setting the final target.\n`);

  log("## Connection & round-trip");
  log("```");
  log(`connection acquisition (cold): ${connectMs} ms`);
  log(`round-trip latency SELECT 1  : avg ${avg(rtts)} ms · max ${mx(rtts)} ms · samples [${rtts.join(", ")}]`);
  log("```\n");

  log("## Cold snapshot load (first load on a fresh connection)");
  log("```");
  log(`total: ${cold.totalMs} ms   (batch1 ${cold.batch1Ms} ms · batch2 ${cold.batch2Ms} ms · construct ${cold.constructMs} ms · 8 queries)`);
  log("per-query (ms):");
  for (const q of perQ) log(`  ${q.label.padEnd(12)} ${q.ms}`);
  log("```\n");

  log("## Warm snapshot load (same connection reused, 5 loads)");
  log("```");
  log(`total   : avg ${warmAvg} ms · max ${mx(warmTotals)} ms · samples [${warmTotals.join(", ")}]`);
  log(`batch1  : avg ${avg(warmB1)} ms   batch2: avg ${avg(warmB2)} ms   construct: avg ${avg(warmConstruct)} ms`);
  log("```\n");

  log("## Multiple requirePermission() in ONE request");
  log("```");
  log(`with React cache() (current): ONE load per request  → ~${warmAvg} ms once, then ~0 ms per extra check`);
  log(`without cache (hypothetical): N loads               → ~${warmAvg} ms × N`);
  log("```\n");

  log(`## Concurrent (${concN} parallel loads, separate pooled connections)`);
  log("```");
  log(`wall time: ${concWallMs} ms   per-load total: avg ${avg(concTotals)} ms · max ${mx(concTotals)} ms`);
  log("```\n");

  // ---- bottleneck attribution ----
  const rttAvg = avg(rtts);
  const coldNonConn = cold.totalMs; // load excluding the one-time connect
  log("## Bottleneck attribution\n");
  log(`- **Connection acquisition:** ${connectMs} ms one-time per NEW connection.`);
  log(`- **Per round-trip:** ~${rttAvg} ms (SELECT 1). The load makes 2 batch waves (5 + 3 queries in`);
  log(`  parallel), so ≈ 2 × round-trip of network latency + query time, not 8 × serial.`);
  log(`- **Query execution + driver:** batch1 ${cold.batch1Ms} ms, batch2 ${cold.batch2Ms} ms (cold) vs`);
  log(`  batch1 ${avg(warmB1)} ms, batch2 ${avg(warmB2)} ms (warm) — the cold/warm delta is connection/first-`);
  log(`  query warmup, not query cost.`);
  log(`- **Construction:** ${cold.constructMs} ms (in-memory; negligible).`);
  const dominant =
    connectMs > coldNonConn ? "CONNECTION ACQUISITION (per-request connection setup)" :
    (cold.batch1Ms + cold.batch2Ms) > 4 * rttAvg ? "QUERY ROUND-TRIP LATENCY (network distance / waves)" :
    "QUERY EXECUTION";
  log(`\n**Dominant cost: ${dominant}.** Construction is negligible; the engine itself is ~0–1 ms (3A).\n`);

  log("## Interpretation → fix design (to benchmark next, not yet applied)\n");
  log("- If **connection acquisition** dominates: ensure ONE warm pooled connection is reused across");
  log("  requests (the app caches the Prisma client globally in `db.ts`; verify no per-request connect on");
  log("  the serverless runtime). Fix = connection reuse, not caching data.");
  log("- If **round-trip latency** dominates (likely from this dev machine; may vanish in prod co-location):");
  log("  reduce round-trips by (a) caching **near-static** data — module registry, resources, actions,");
  log("  roles, role→permissions — in-process with a short TTL invalidated on IAM writes, so only the");
  log("  request-specific grants/scopes are fetched per request; and (b) re-measuring in a production-");
  log("  representative environment before committing.");
  log("- Separation to preserve: **request-specific** (principal, org/workspace/entity context, that");
  log("  principal's grants + their scopes) vs **near-static** (registry, roles, role→permissions,");
  log("  entity/principal id sets). Only the near-static half is cache-safe.\n");

  log("## Proposed hard target (to ratify after a production-representative re-measure)\n");
  log("- Total authorization snapshot overhead **≤ 50 ms p95** on the authoritative path (warm), with the");
  log("  engine decision **≤ 2 ms**. Canary expansion stays blocked until this is met and verified.\n");

  fs.writeFileSync(OUT, L.join("\n"), "utf8");
  console.log("3A-P BENCHMARK complete.");
  console.log(`connect ${connectMs}ms | rtt avg ${rttAvg}ms | cold load ${cold.totalMs}ms (b1 ${cold.batch1Ms}/b2 ${cold.batch2Ms}/construct ${cold.constructMs}) | warm avg ${warmAvg}ms | concurrent(${concN}) wall ${concWallMs}ms`);
  console.log("per-query cold:", perQ.map((q) => `${q.label}=${q.ms}`).join(" "));
  console.log("Report:", OUT);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
