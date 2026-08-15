/**
 * OCTIEN IAM — Increment 2D: SHADOW-comparison harness (READ-ONLY).
 *
 * Proves the OCTIEN Permission Engine *code* (apps/frontend/src/lib/iam/permission-engine.ts,
 * compiled to $ENGINE_JS) reproduces the legacy authorization decision for the complete pilot
 * decision space — the same comparison as 2C but routed THROUGH the real engine functions
 * (decide / scopeFilter) rather than a SQL join. Legacy remains authoritative; nothing here is
 * wired into the request path. Strictly read-only against Neon; report written locally only.
 *
 * Usage:
 *   ENGINE_JS=<compiled permission-engine.js> NODE_PATH=<repo>/node_modules \
 *     node packages/database/iam-migration/shadow_2d.js
 */
const fs = require("fs");
const path = require("path");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

const REPO = "D:/1/cosmyerp/COSMY-BOS";
const OUT = path.join(REPO, "packages/database/iam-migration/IAM_SHADOW_2D_REPORT.md");
const MUTATING = /\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|MERGE|COPY)\b/i;

const engine = require(process.env.ENGINE_JS); // compiled permission-engine.js
if (typeof engine.decide !== "function" || typeof engine.scopeFilter !== "function") {
  console.error("ENGINE_JS does not export decide/scopeFilter"); process.exit(1);
}

function readDatabaseUrl() {
  const env = fs.readFileSync(path.join(REPO, ".env"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  let v = line.slice("DATABASE_URL=".length).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}
async function ro(client, sql) {
  const s = sql.trim();
  if (!/^SELECT\b/i.test(s) || MUTATING.test(s)) throw new Error("REFUSED (non-SELECT): " + s.slice(0, 80));
  return (await client.query(s)).rows;
}
const K = (p, e, r, a) => `${p}|${e}|${r}|${a}`;

async function main() {
  const url = readDatabaseUrl();
  const hostRedacted = (url.match(/@([^/:?]+)/) || [null, "unknown"])[1];
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  await client.query("BEGIN");
  await client.query("SET TRANSACTION READ ONLY");

  const idn = (await ro(client, "SELECT current_database() AS db"))[0];
  const principalsRows = await ro(client, 'SELECT "id" FROM "iam_principals"');
  const entitiesRows = await ro(client, 'SELECT "id" FROM "iam_entities"');
  const grantsRows = await ro(client, 'SELECT "id","principalId","roleId","scopeId","effect","state","startAt","endAt" FROM "iam_grants"');
  const scopeDimRows = await ro(client, 'SELECT "scopeId","dimension","nodeId","valueKey","mode" FROM "iam_scope_dimensions"');
  const rolePermRows = await ro(client, 'SELECT rp."roleId" AS "roleId", p."resource" AS resource, p."action" AS action FROM "role_permissions" rp JOIN "permissions" p ON p."id"=rp."permissionId"');
  const registryRows = await ro(client, 'SELECT rd."key" AS resource, ad."key" AS action FROM "iam_action_definitions" ad JOIN "iam_resource_definitions" rd ON rd."id"=ad."resourceDefId"');
  const permissionPairs = await ro(client, 'SELECT DISTINCT "resource", "action" FROM "permissions"');
  const memberships = await ro(client, 'SELECT "userId","businessId" FROM "memberships"');
  const legacyRows = await ro(client, `
    SELECT DISTINCT m."userId" AS principal, m."businessId" AS entity, p."resource" AS resource, p."action" AS action
    FROM "memberships" m
    JOIN "role_permissions" rp ON rp."roleId" = m."roleId"
    JOIN "permissions" p ON p."id" = rp."permissionId"`);

  await client.query("ROLLBACK");
  client.release(); await pool.end();

  // ---- Build the engine snapshot (in-memory; no I/O inside the engine) ----
  const grantsByPrincipal = new Map();
  for (const g of grantsRows) {
    const row = {
      id: g.id, principalId: g.principalId, roleId: g.roleId, scopeId: g.scopeId,
      effect: g.effect, state: g.state,
      startAt: g.startAt ? new Date(g.startAt).toISOString() : null,
      endAt: g.endAt ? new Date(g.endAt).toISOString() : null,
    };
    if (!grantsByPrincipal.has(g.principalId)) grantsByPrincipal.set(g.principalId, []);
    grantsByPrincipal.get(g.principalId).push(row);
  }
  const scopeDimsByScope = new Map();
  for (const d of scopeDimRows) {
    if (!scopeDimsByScope.has(d.scopeId)) scopeDimsByScope.set(d.scopeId, []);
    scopeDimsByScope.get(d.scopeId).push({ dimension: d.dimension, nodeId: d.nodeId, valueKey: d.valueKey, mode: d.mode });
  }
  const rolePermissions = new Map();
  for (const r of rolePermRows) {
    if (!rolePermissions.has(r.roleId)) rolePermissions.set(r.roleId, new Set());
    rolePermissions.get(r.roleId).add(`${r.resource}|${r.action}`);
  }
  const snapshot = {
    principals: new Set(principalsRows.map(r => r.id)),
    entities: new Set(entitiesRows.map(r => r.id)),
    grantsByPrincipal,
    scopeDimsByScope,
    rolePermissions,
    registryActions: new Set(registryRows.map(r => `${r.resource}|${r.action}`)),
    now: Date.now(),
  };

  const legacySet = new Set(legacyRows.map(r => K(r.principal, r.entity, r.resource, r.action)));
  const membershipSet = new Set(memberships.map(m => `${m.userId}|${m.businessId}`));
  const users = [...snapshot.principals];
  const ents = [...snapshot.entities];
  const pairs = permissionPairs.map(p => ({ resource: p.resource, action: p.action }));

  const problems = [];
  const L = []; const log = (s = "") => L.push(s);

  // ---- Point-decision shadow: engine.decide vs legacy over the full matrix + edges ----
  let pointMatches = 0, pointMismatches = 0;
  const evalTuple = (p, e, r, a, tag) => {
    const legacy = legacySet.has(K(p, e, r, a)) ? "ALLOW" : "DENY";
    const eng = engine.decide(snapshot, p, e, r, a);
    const octien = eng.decision;
    const match = legacy === octien;
    if (match) pointMatches++; else { pointMismatches++; problems.push(`point mismatch ${K(p, e, r, a)} legacy=${legacy} engine=${octien} (${eng.reason})`); }
    return { principal: p, entity: e, resource: r, action: a, legacy, octien, reason: eng.reason, match, tag };
  };
  let pointCount = 0;
  for (const u of users) for (const e of ents) for (const pr of pairs) { evalTuple(u, e, pr.resource, pr.action, "matrix"); pointCount++; }

  const edge = [];
  const u0 = users[0], e0 = ents[0], realPair = pairs[0];
  edge.push(evalTuple(u0, e0, "__unknown_resource__", "read", "unknown-resource"));
  edge.push(evalTuple(u0, e0, realPair.resource, "__unknown_action__", "unknown-action"));
  edge.push(evalTuple(u0, "__unknown_entity__", realPair.resource, realPair.action, "unknown-entity"));
  edge.push(evalTuple("__unknown_principal__", e0, realPair.resource, realPair.action, "unknown-principal"));
  // entity with vs without membership, per user
  for (const u of users) {
    const mine = memberships.filter(m => m.userId === u).map(m => m.businessId);
    const notMine = ents.filter(id => !mine.includes(id));
    const myPair = legacyRows.find(r => r.principal === u);
    if (myPair) {
      if (mine.length) edge.push(evalTuple(u, mine[0], myPair.resource, myPair.action, "entity-with-membership(ALLOW)"));
      if (notMine.length) edge.push(evalTuple(u, notMine[0], myPair.resource, myPair.action, "entity-without-membership(DENY)"));
    }
  }

  // ---- List/set shadow: engine.scopeFilter vs legacy entity sets ----
  const legacyEntsBy = {};
  for (const r of legacyRows) {
    const k = `${r.principal}|${r.resource}|${r.action}`;
    (legacyEntsBy[k] = legacyEntsBy[k] || new Set()).add(r.entity);
  }
  let listCompared = 0, listMismatches = 0;
  for (const u of users) for (const pr of pairs) {
    listCompared++;
    const k = `${u}|${pr.resource}|${pr.action}`;
    const legacyEnts = [...(legacyEntsBy[k] || new Set())].sort().join(",");
    const engineEnts = engine.scopeFilter(snapshot, u, pr.resource, pr.action).sort().join(",");
    if (legacyEnts !== engineEnts) { listMismatches++; problems.push(`list/set mismatch ${k}: legacy={${legacyEnts}} engine={${engineEnts}}`); }
  }

  const totalMismatches = problems.length;

  // ================= REPORT =================
  const now = new Date().toISOString();
  log("# OCTIEN IAM — Increment 2D Shadow Authorization Report (READ-ONLY)\n");
  log(`> The OCTIEN Permission Engine CODE evaluated in parallel with the legacy path over the full`);
  log(`> pilot decision space. Legacy remains authoritative; the engine is wired to NOTHING in the`);
  log(`> request path. Read-only; no writes. Generated: ${now}`);
  log(`> Engine: apps/frontend/src/lib/iam/permission-engine.ts · Database: \`${idn.db}\` @ \`${hostRedacted}\`\n`);

  log("## Snapshot fed to the engine\n");
  log(`- principals: ${snapshot.principals.size} · entities: ${snapshot.entities.size}`);
  log(`- grants: ${grantsRows.length} · scope dimensions: ${scopeDimRows.length}`);
  log(`- roles with permissions: ${snapshot.rolePermissions.size} · registered actions: ${snapshot.registryActions.size}`);
  log(`- permission pairs (matrix actions): ${pairs.length}\n`);

  log("## 1. Point-decision shadow (engine.decide vs legacy)\n");
  log(`- Matrix tuples: **${pointCount}** (principals ${users.length} × entities ${ents.length} × pairs ${pairs.length}) + ${edge.length} edge tuples`);
  log(`- Matches: **${pointMatches}** · Mismatches: **${pointMismatches}** ${pointMismatches === 0 ? "✔" : "❌"}\n`);

  log("## 2. List/set shadow (engine.scopeFilter vs legacy entity sets)\n");
  log(`- (principal,resource,action) sets compared: **${listCompared}**`);
  log(`- Mismatches: **${listMismatches}** ${listMismatches === 0 ? "✔" : "❌"}\n`);

  log("## 3. Edge cases (through the engine)\n");
  log("| # | Case | legacy | engine | reason | match |");
  log("|---|---|---|---|---|---|");
  edge.forEach((r, i) => log(`| ${i + 1} | ${r.tag} | ${r.legacy} | ${r.octien} | ${r.reason} | ${r.match ? "✔" : "❌"} |`));
  log("");

  if (problems.length) { log("## Mismatch details\n"); for (const p of problems.slice(0, 100)) log(`- ${p}`); log(""); }

  log("## FINAL SHADOW RESULT\n");
  log(`| Dimension | Mismatches |`); log(`|---|---|`);
  log(`| point decisions | ${pointMismatches} |`);
  log(`| list/set | ${listMismatches} |`);
  log(`\n**TOTAL SHADOW MISMATCHES: ${totalMismatches}**\n`);
  log(totalMismatches === 0
    ? "**IAM Increment 2D — SHADOW VERIFIED ✔** — the OCTIEN Permission Engine code reproduces today's authorization decisions exactly. Legacy remains authoritative; nothing was enforced or wired into requests."
    : "**SHADOW FAILED ❌ — STOP.** Do not wire the engine into any request path. Classify each mismatch and get explicit review.");

  fs.writeFileSync(OUT, L.join("\n"), "utf8");
  console.log(totalMismatches === 0 ? "SHADOW 2D: VERIFIED ✔" : "SHADOW 2D: FAILED ❌");
  console.log(`point=${pointCount} (mm ${pointMismatches}) | list sets=${listCompared} (mm ${listMismatches}) | legacyAllow=${legacySet.size}`);
  console.log("TOTAL SHADOW MISMATCHES:", totalMismatches);
  console.log("Report:", OUT);
  if (totalMismatches !== 0) process.exit(1);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
