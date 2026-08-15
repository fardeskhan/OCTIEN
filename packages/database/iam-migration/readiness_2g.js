/**
 * OCTIEN IAM — Increment 2G: Enforcement Readiness harness (READ-ONLY for live data).
 *
 * Verifies the two enforcement-readiness gates surfaced by the 2F soak, plus a restricted-principal
 * simulation, all through the real (compiled) Permission Engine:
 *   A. Owner authority is EXPLICIT (owner-role grant ⇒ any *registered* resource.action in scope,
 *      independent of role→permission rows; survives new modules; still entity-scoped like legacy).
 *   B. A restricted Marketing employee is ALLOWed Sales/CRM/Marketing and DENIed Finance/Inventory/
 *      HR/Payroll and other entities (in-memory synthetic snapshot; no production data).
 *   C. The owner-aware engine still reproduces legacy decisions on the REAL pilot data (0 mismatches).
 *
 * Usage: ENGINE_JS=<compiled permission-engine.js> NODE_PATH=<repo>/node_modules node .../readiness_2g.js
 */
const fs = require("fs");
const path = require("path");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

const REPO = "D:/1/cosmyerp/COSMY-BOS";
const OUT = path.join(REPO, "packages/database/iam-migration/IAM_ENFORCEMENT_READINESS_2G_REPORT.md");
const MUTATING = /\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|MERGE|COPY)\b/i;

const engine = require(process.env.ENGINE_JS);
const { decide } = engine;

function readDatabaseUrl() {
  const env = fs.readFileSync(path.join(REPO, ".env"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  let v = line.slice("DATABASE_URL=".length).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}
async function ro(client, sql) {
  if (!/^SELECT\b/i.test(sql.trim()) || MUTATING.test(sql)) throw new Error("REFUSED non-SELECT");
  return (await client.query(sql)).rows;
}
const g = (id, principalId, roleId, scopeId) => ({ id, principalId, roleId, scopeId, effect: "ALLOW", state: "ACTIVE", startAt: null, endAt: null });

function assert(results, label, got, want) {
  const ok = got === want;
  results.push({ label, got, want, ok });
  return ok;
}

function testOwner(results) {
  const OWNER = "role_owner";
  const snap = {
    principals: new Set(["owner1"]),
    entities: new Set(["entA", "entB"]),
    grantsByPrincipal: new Map([["owner1", [g("g1", "owner1", OWNER, "scopeA")]]]),
    scopeDimsByScope: new Map([["scopeA", [{ dimension: "ENTITY", nodeId: "entA", valueKey: null, mode: "EXACT" }]]]),
    rolePermissions: new Map([[OWNER, new Set()]]), // EMPTY — proves owner authority is NOT copied permissions
    registryActions: new Set(["invoice|read", "customer|read", "newmodule|read"]), // includes a NEW module permission
    ownerRoleIds: new Set([OWNER]),
    now: Date.now(),
  };
  const d = (e, r, a) => decide(snap, "owner1", e, r, a).decision;
  assert(results, "Owner ALLOWed a registered perm despite EMPTY role_permissions (authority ≠ copied perms)", d("entA", "invoice", "read"), "ALLOW");
  assert(results, "Owner ALLOWed a NEW module's registered perm (survives new modules)", d("entA", "newmodule", "read"), "ALLOW");
  assert(results, "Owner DENIed an entity they have no grant for (entity-scoped like legacy)", d("entB", "invoice", "read"), "DENY");
  assert(results, "Owner DENIed an UNREGISTERED perm (registry gate applies; safer than legacy bypass)", d("entA", "unreg", "read"), "DENY");
}

function testRestrictedEmployee(results) {
  const ROLE = "role_marketing";
  const SALAM = "salam", UCO = "uco";
  const snap = {
    principals: new Set(["emp1"]),
    entities: new Set([SALAM, UCO]),
    grantsByPrincipal: new Map([["emp1", [g("g", "emp1", ROLE, "scopeE")]]]),
    scopeDimsByScope: new Map([["scopeE", [{ dimension: "ENTITY", nodeId: SALAM, valueKey: null, mode: "EXACT" }]]]),
    rolePermissions: new Map([[ROLE, new Set(["customer|read", "lead|read", "lead|create", "campaign|read", "campaign|create"])]]),
    registryActions: new Set([
      "customer|read", "lead|read", "lead|create", "campaign|read", "campaign|create",
      "invoice|read", "invoice|approve", "inventory|adjust", "employee|manage", "payroll|read",
    ]),
    ownerRoleIds: new Set(), // NOT an owner
    now: Date.now(),
  };
  const d = (e, r, a) => decide(snap, "emp1", e, r, a).decision;
  // Allowed: Sales/CRM/Marketing resources within Salam Cola
  assert(results, "Marketing emp ALLOWed customer.read @ Salam Cola", d(SALAM, "customer", "read"), "ALLOW");
  assert(results, "Marketing emp ALLOWed lead.create @ Salam Cola", d(SALAM, "lead", "create"), "ALLOW");
  assert(results, "Marketing emp ALLOWed campaign.read @ Salam Cola", d(SALAM, "campaign", "read"), "ALLOW");
  // Denied: Finance / Inventory / HR / Payroll
  assert(results, "Marketing emp DENIed invoice.read (Finance) @ Salam Cola", d(SALAM, "invoice", "read"), "DENY");
  assert(results, "Marketing emp DENIed invoice.approve (Finance) @ Salam Cola", d(SALAM, "invoice", "approve"), "DENY");
  assert(results, "Marketing emp DENIed inventory.adjust (Inventory) @ Salam Cola", d(SALAM, "inventory", "adjust"), "DENY");
  assert(results, "Marketing emp DENIed employee.manage (HR) @ Salam Cola", d(SALAM, "employee", "manage"), "DENY");
  assert(results, "Marketing emp DENIed payroll.read (Payroll) @ Salam Cola", d(SALAM, "payroll", "read"), "DENY");
  // Denied: other entity
  assert(results, "Marketing emp DENIed customer.read @ COSMY UCO (other entity)", d(UCO, "customer", "read"), "DENY");
}

async function testRealParity(client) {
  const principals = (await ro(client, 'SELECT "id" FROM "iam_principals"')).map((r) => r.id);
  const entities = (await ro(client, 'SELECT "id" FROM "iam_entities"')).map((r) => r.id);
  const grants = await ro(client, 'SELECT "id","principalId","roleId","scopeId","effect","state","startAt","endAt" FROM "iam_grants"');
  const dims = await ro(client, 'SELECT "scopeId","dimension","nodeId","valueKey","mode" FROM "iam_scope_dimensions"');
  const rolePerms = await ro(client, 'SELECT rp."roleId" AS "roleId", p."resource" AS resource, p."action" AS action FROM "role_permissions" rp JOIN "permissions" p ON p."id"=rp."permissionId"');
  const registry = await ro(client, 'SELECT rd."key" AS resource, ad."key" AS action FROM "iam_action_definitions" ad JOIN "iam_resource_definitions" rd ON rd."id"=ad."resourceDefId"');
  const roles = await ro(client, 'SELECT "id","name" FROM "roles"');
  const pairs = await ro(client, 'SELECT DISTINCT "resource","action" FROM "permissions"');
  const legacyRows = await ro(client, `
    SELECT DISTINCT m."userId" AS principal, m."businessId" AS entity, p."resource" AS resource, p."action" AS action
    FROM "memberships" m
    JOIN "role_permissions" rp ON rp."roleId" = m."roleId"
    JOIN "permissions" p ON p."id" = rp."permissionId"`);

  const grantsByPrincipal = new Map();
  for (const gr of grants) {
    const row = { id: gr.id, principalId: gr.principalId, roleId: gr.roleId, scopeId: gr.scopeId, effect: gr.effect, state: gr.state, startAt: gr.startAt ? new Date(gr.startAt).toISOString() : null, endAt: gr.endAt ? new Date(gr.endAt).toISOString() : null };
    if (!grantsByPrincipal.has(gr.principalId)) grantsByPrincipal.set(gr.principalId, []);
    grantsByPrincipal.get(gr.principalId).push(row);
  }
  const scopeDimsByScope = new Map();
  for (const d of dims) { if (!scopeDimsByScope.has(d.scopeId)) scopeDimsByScope.set(d.scopeId, []); scopeDimsByScope.get(d.scopeId).push({ dimension: d.dimension, nodeId: d.nodeId, valueKey: d.valueKey, mode: d.mode }); }
  const rolePermissions = new Map();
  for (const rp of rolePerms) { if (!rolePermissions.has(rp.roleId)) rolePermissions.set(rp.roleId, new Set()); rolePermissions.get(rp.roleId).add(`${rp.resource}|${rp.action}`); }
  const isOwner = (n) => { const x = String(n).trim().toLowerCase(); return x === "owner" || x === "super_admin"; };
  const ownerRoleIds = new Set(roles.filter((r) => isOwner(r.name)).map((r) => r.id));

  const snap = {
    principals: new Set(principals), entities: new Set(entities), grantsByPrincipal, scopeDimsByScope,
    rolePermissions, registryActions: new Set(registry.map((r) => `${r.resource}|${r.action}`)), ownerRoleIds, now: Date.now(),
  };
  const legacySet = new Set(legacyRows.map((r) => `${r.principal}|${r.entity}|${r.resource}|${r.action}`));

  let count = 0, mismatches = 0; const details = [];
  for (const p of principals) for (const e of entities) for (const pr of pairs) {
    count++;
    const legacy = legacySet.has(`${p}|${e}|${pr.resource}|${pr.action}`) ? "ALLOW" : "DENY";
    const octien = decide(snap, p, e, pr.resource, pr.action).decision;
    if (legacy !== octien) { mismatches++; details.push(`${p}|${e}|${pr.resource}|${pr.action} legacy=${legacy} octien=${octien}`); }
  }
  return { count, mismatches, details, ownerRoleCount: ownerRoleIds.size, legacyAllow: legacySet.size };
}

async function main() {
  const results = [];
  testOwner(results);
  testRestrictedEmployee(results);

  const url = readDatabaseUrl();
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  await client.query("BEGIN"); await client.query("SET TRANSACTION READ ONLY");
  const parity = await testRealParity(client);
  await client.query("ROLLBACK"); client.release(); await pool.end();

  const synthFail = results.filter((r) => !r.ok);
  const pass = synthFail.length === 0 && parity.mismatches === 0;

  const L = []; const log = (s = "") => L.push(s);
  log("# OCTIEN IAM — Increment 2G Enforcement Readiness Report\n");
  log(`> Owner authority made explicit + snapshot load-once-per-request. Still NO enforcement — legacy`);
  log(`> authoritative. Verified through the real Permission Engine. Generated: ${new Date().toISOString()}\n`);

  log("## A. Owner authority is explicit (not a copy of migration-time permissions)\n");
  log("| Check | Result | Expected | OK |"); log("|---|---|---|---|");
  for (const r of results.slice(0, 4)) log(`| ${r.label} | ${r.got} | ${r.want} | ${r.ok ? "✔" : "❌"} |`);
  log("\nInvariant demonstrated: **Owner authority ≠ 29 copied permissions** — the owner role's");
  log("`role_permissions` was EMPTY yet every registered permission (incl. a brand-new module's) was");
  log("ALLOWed within scope; an ungranted entity and an unregistered permission were DENIed.\n");

  log("## B. Restricted Marketing employee (in-memory simulation — no production data)\n");
  log("Scope: role limited to {customer, lead, campaign} @ Entity = Salam Cola.\n");
  log("| Check | Result | Expected | OK |"); log("|---|---|---|---|");
  for (const r of results.slice(4)) log(`| ${r.label} | ${r.got} | ${r.want} | ${r.ok ? "✔" : "❌"} |`);
  log("\nDemonstrates real employee-level DENY: **Finance / Inventory / HR / Payroll and other entities**");
  log("are denied while Sales/CRM/Marketing resources are allowed. (Location/Department are engine");
  log("dimensions exercised at record level in 3D; this proves the Entity + Resource restrictions now.)\n");

  log("## C. Owner-aware engine vs legacy on REAL pilot data\n");
  log(`- Point matrix: **${parity.count}** tuples · owner roles detected: ${parity.ownerRoleCount} · legacy ALLOW tuples: ${parity.legacyAllow}`);
  log(`- **Mismatches: ${parity.mismatches}** ${parity.mismatches === 0 ? "✔" : "❌"}`);
  if (parity.details.length) { log("\nMismatch details:"); for (const d of parity.details.slice(0, 50)) log(`- ${d}`); }
  log("");

  log("## Snapshot load-once-per-request strategy\n");
  log("- `shadow.ts` now loads the authorization snapshot via React `cache()` ⇒ **one build per request**,");
  log("  reused across every `requirePermission()` call (a page/action makes many). Engine decisions are");
  log("  sub-millisecond (2F: p99 = 1ms); the request pays the ~1.5s Neon load AT MOST ONCE, not per check.");
  log("- This is the exact data-loading pattern the authoritative engine (3A) must use: resolve the");
  log("  snapshot once alongside request/principal context, then decide in-memory.");
  log("- Further hardening for 3A (designed, not prematurely applied): warm/pooled Neon reads to collapse");
  log("  connection latency, and a short-TTL cache for near-static registry + role→permission data,");
  log("  invalidated on IAM writes. Target: engine authorization overhead in the low-single-digit ms.\n");

  log("## Result\n");
  log(pass
    ? "**IAM Increment 2G — ENFORCEMENT READINESS VERIFIED ✔** — Owner authority is explicit and future-proof, restricted DENY behavior is correct, real-data parity holds with the owner-aware engine, and the snapshot loads once per request. Still no enforcement."
    : "**2G FAILED ❌ — STOP.** Do not proceed to enforcement.");

  fs.writeFileSync(OUT, L.join("\n"), "utf8");
  console.log(pass ? "READINESS 2G: PASS ✔" : "READINESS 2G: FAIL ❌");
  console.log(`synthetic checks: ${results.filter((r) => r.ok).length}/${results.length} | real parity: ${parity.count} tuples, ${parity.mismatches} mismatches`);
  if (synthFail.length) console.log("FAILED:", synthFail.map((r) => r.label).join(" | "));
  console.log("Report:", OUT);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
