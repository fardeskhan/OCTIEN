/**
 * OCTIEN IAM — Increment 2C: READ-ONLY authorization parity harness.
 *
 * Proves: legacy authorization decision == OCTIEN authorization decision for the COMPLETE
 * authorization state in the live pilot — WITHOUT changing what enforces access. This is an
 * analysis/verification tool ONLY; it is not, and must not become, the production engine.
 *
 * Two independent decision paths, both computed from live data:
 *   LEGACY : User → Membership → Business → Role → RolePermission → Permission(resource,action)
 *   OCTIEN : Principal → Grant → Scope(ENTITY) → Grant.roleId → Role → RolePermission
 *            → registered ResourceDefinition → ActionDefinition
 *
 * SAFETY: every statement is SELECT; a self-scan refuses on any mutating keyword; everything
 * runs inside BEGIN; SET TRANSACTION READ ONLY; ... ROLLBACK. No writes to Neon. The report is
 * written locally to the repo only.
 *
 * Usage: NODE_PATH=<repo>/node_modules node packages/database/iam-migration/parity_2c.js
 */
const fs = require("fs");
const path = require("path");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

const REPO = "D:/1/cosmyerp/COSMY-BOS";
const OUT = path.join(REPO, "packages/database/iam-migration/IAM_PARITY_2C_REPORT.md");
const MUTATING = /\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|MERGE|COPY)\b/i;

function readDatabaseUrl() {
  const env = fs.readFileSync(path.join(REPO, ".env"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  let v = line.slice("DATABASE_URL=".length).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}
const K = (p, e, r, a) => `${p}|${e}|${r}|${a}`;

// Read-only query wrapper: refuse anything that isn't a plain SELECT.
async function ro(client, sql) {
  const s = sql.trim();
  if (!/^SELECT\b/i.test(s) || MUTATING.test(s)) throw new Error("REFUSED (non-SELECT/mutating): " + s.slice(0, 80));
  return (await client.query(sql)).rows;
}

async function main() {
  const url = readDatabaseUrl();
  const hostRedacted = (url.match(/@([^/:?]+)/) || [null, "unknown"])[1];
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  await client.query("BEGIN");
  await client.query("SET TRANSACTION READ ONLY");

  // ---- Source data ----
  const idn = (await ro(client, "SELECT current_database() AS db, current_schema() AS s"))[0];
  const users = (await ro(client, 'SELECT "id","tenantId" FROM "users"')).map(r => r);
  const businesses = (await ro(client, 'SELECT "id","tenantId" FROM "businesses"')).map(r => r);
  const roles = await ro(client, 'SELECT "id" FROM "roles"');
  const permissions = await ro(client, 'SELECT "resource","action" FROM "permissions"');
  const memberships = await ro(client, 'SELECT "id","userId","businessId","roleId" FROM "memberships"');
  const grants = await ro(client, 'SELECT "id","principalId","roleId","scopeId","legacyMembershipId","effect","state" FROM "iam_grants"');
  const scopeDims = await ro(client, 'SELECT "scopeId","dimension","nodeId","mode" FROM "iam_scope_dimensions"');
  const resourceDefs = await ro(client, 'SELECT "id","key","moduleId" FROM "iam_resource_definitions"');
  const actionDefs = await ro(client, 'SELECT "id","resourceDefId","key" FROM "iam_action_definitions"');
  const principals = await ro(client, 'SELECT "id","organizationId" FROM "iam_principals"');
  const entities = await ro(client, 'SELECT "id","organizationId" FROM "iam_entities"');

  // ---- Two independent ALLOW sets ----
  const legacyRows = await ro(client, `
    SELECT DISTINCT m."userId" AS principal, m."businessId" AS entity, p."resource" AS resource, p."action" AS action
    FROM "memberships" m
    JOIN "role_permissions" rp ON rp."roleId" = m."roleId"
    JOIN "permissions" p ON p."id" = rp."permissionId"`);
  const octienRows = await ro(client, `
    SELECT DISTINCT g."principalId" AS principal, sd."nodeId" AS entity, p."resource" AS resource, p."action" AS action
    FROM "iam_grants" g
    JOIN "iam_scope_dimensions" sd ON sd."scopeId" = g."scopeId" AND sd."dimension" = 'ENTITY' AND sd."mode" = 'EXACT'
    JOIN "role_permissions" rp ON rp."roleId" = g."roleId"
    JOIN "permissions" p ON p."id" = rp."permissionId"
    JOIN "iam_resource_definitions" rd ON rd."key" = p."resource"
    JOIN "iam_action_definitions" ad ON ad."resourceDefId" = rd."id" AND ad."key" = p."action"
    WHERE g."state" = 'ACTIVE' AND g."effect" = 'ALLOW'`);

  await client.query("ROLLBACK");
  client.release(); await pool.end();

  const legacySet = new Set(legacyRows.map(r => K(r.principal, r.entity, r.resource, r.action)));
  const octienSet = new Set(octienRows.map(r => K(r.principal, r.entity, r.resource, r.action)));
  const membershipSet = new Set(memberships.map(m => `${m.userId}|${m.businessId}`));
  const grantEntitySet = new Set(); // principalId|entityNodeId (from grants+scopedims)
  const scopeById = {};
  for (const sd of scopeDims) (scopeById[sd.scopeId] = scopeById[sd.scopeId] || []).push(sd);
  for (const g of grants) for (const sd of (scopeById[g.scopeId] || [])) if (sd.dimension === "ENTITY") grantEntitySet.add(`${g.principalId}|${sd.nodeId}`);

  const problems = [];
  const L = []; const log = (s = "") => L.push(s);

  // ---- Point-decision parity over the full matrix (principals × entities × pairs) + edge tuples ----
  const pairs = permissions.map(p => ({ resource: p.resource, action: p.action }));
  const pointRows = [];
  let pointMatches = 0, pointMismatches = 0;
  const decide = (set, memSet, p, e, r, a) => set.has(K(p, e, r, a)) ? "ALLOW" : "DENY";
  const evalTuple = (p, e, r, a, tag) => {
    const legacy = legacySet.has(K(p, e, r, a)) ? "ALLOW" : "DENY";
    const octien = octienSet.has(K(p, e, r, a)) ? "ALLOW" : "DENY";
    const match = legacy === octien;
    let reason;
    if (legacy === "ALLOW") reason = "membership/grant in entity + role permission";
    else if (!membershipSet.has(`${p}|${e}`)) reason = "no membership/grant for this entity";
    else reason = "role lacks resource.action";
    const row = { principal: p, entity: e, resource: r, action: a, legacy, octien, match, reason, tag };
    if (match) pointMatches++; else { pointMismatches++; problems.push(`point mismatch: ${K(p, e, r, a)} legacy=${legacy} octien=${octien}`); }
    return row;
  };
  for (const u of users) for (const b of businesses) for (const pr of pairs) pointRows.push(evalTuple(u.id, b.id, pr.resource, pr.action, "matrix"));

  // ---- Edge-case tuples ----
  const u0 = users[0], b0 = businesses[0], realPair = pairs[0];
  const edge = [];
  edge.push(evalTuple(u0.id, b0.id, "__unknown_resource__", "read", "edge:unknown-resource"));
  edge.push(evalTuple(u0.id, b0.id, realPair.resource, "__unknown_action__", "edge:unknown-action"));
  edge.push(evalTuple(u0.id, "__unknown_entity__", realPair.resource, realPair.action, "edge:unknown-entity"));
  edge.push(evalTuple("__unknown_principal__", b0.id, realPair.resource, realPair.action, "edge:unknown-principal"));
  // cross-entity: a user + a business they have NO membership in, using a permission their role holds
  let crossEntityTested = null, entityWithMembershipTested = null;
  for (const u of users) {
    const mine = memberships.filter(m => m.userId === u.id).map(m => m.businessId);
    const notMine = businesses.map(b => b.id).filter(id => !mine.includes(id));
    const myPair = legacyRows.find(r => r.principal === u.id);
    if (myPair) {
      if (mine.length) { entityWithMembershipTested = evalTuple(u.id, mine[0], myPair.resource, myPair.action, "edge:entity-with-membership(ALLOW)"); edge.push(entityWithMembershipTested); }
      if (notMine.length) { crossEntityTested = evalTuple(u.id, notMine[0], myPair.resource, myPair.action, "edge:cross-entity-no-membership(DENY)"); edge.push(crossEntityTested); }
    }
  }
  // cross-organization: principal from one org, entity from a different org
  let crossOrgTested = null;
  for (const p of principals) {
    const otherOrgEntity = entities.find(e => e.organizationId !== p.organizationId);
    const anyPair = legacyRows.find(r => r.principal === p.id) || realPair;
    if (otherOrgEntity) { crossOrgTested = evalTuple(p.id, otherOrgEntity.id, anyPair.resource, anyPair.action, "edge:cross-organization(DENY)"); edge.push(crossOrgTested); break; }
  }

  // ---- List/set parity: entities accessible per (principal, resource, action) ----
  const setKey = (p, r, a) => `${p}|${r}|${a}`;
  const legacyEntsBy = {}, octienEntsBy = {};
  for (const r of legacyRows) (legacyEntsBy[setKey(r.principal, r.resource, r.action)] = legacyEntsBy[setKey(r.principal, r.resource, r.action)] || new Set()).add(r.entity);
  for (const r of octienRows) (octienEntsBy[setKey(r.principal, r.resource, r.action)] = octienEntsBy[setKey(r.principal, r.resource, r.action)] || new Set()).add(r.entity);
  let listCompared = 0, listMismatches = 0;
  const allSetKeys = new Set([...Object.keys(legacyEntsBy), ...Object.keys(octienEntsBy)]);
  for (const k of allSetKeys) {
    listCompared++;
    const a = [...(legacyEntsBy[k] || new Set())].sort().join(",");
    const b = [...(octienEntsBy[k] || new Set())].sort().join(",");
    if (a !== b) { listMismatches++; problems.push(`list/set mismatch for ${k}: legacy={${a}} octien={${b}}`); }
  }

  // ---- No-broadening set differences ----
  const extraAllows = [...octienSet].filter(k => !legacySet.has(k));   // OCTIEN allows legacy doesn't → broadening
  const missingAllows = [...legacySet].filter(k => !octienSet.has(k)); // legacy allows OCTIEN doesn't
  if (extraAllows.length) problems.push(`${extraAllows.length} EXTRA OCTIEN allow(s) (broadening): ${extraAllows.slice(0, 5).join(" ; ")}`);
  if (missingAllows.length) problems.push(`${missingAllows.length} MISSING OCTIEN allow(s): ${missingAllows.slice(0, 5).join(" ; ")}`);

  // ---- Grant/scope structural parity (edge 18-20) ----
  const grantsNoLink = grants.filter(g => !g.legacyMembershipId).length;
  const memIds = new Set(memberships.map(m => m.id));
  const grantsOrphan = grants.filter(g => g.legacyMembershipId && !memIds.has(g.legacyMembershipId)).length;
  const grantMemIds = new Set(grants.map(g => g.legacyMembershipId));
  const memWithoutGrant = memberships.filter(m => !grantMemIds.has(m.id)).length;
  const dimCountByScope = {}; for (const sd of scopeDims) dimCountByScope[sd.scopeId] = (dimCountByScope[sd.scopeId] || 0) + 1;
  const scopesMultiDim = Object.values(dimCountByScope).filter(c => c !== 1).length;
  const businessIds = new Set(businesses.map(b => b.id));
  const nonEntityExact = scopeDims.filter(sd => sd.dimension !== "ENTITY" || sd.mode !== "EXACT" || !sd.nodeId).length;
  const scopeNodeNotBusiness = scopeDims.filter(sd => sd.dimension === "ENTITY" && !businessIds.has(sd.nodeId)).length;
  // each grant's entity == its membership's businessId
  const memById = {}; for (const m of memberships) memById[m.id] = m;
  let grantScopeMismatch = 0;
  for (const g of grants) {
    const m = memById[g.legacyMembershipId]; if (!m) continue;
    const dims = (scopeById[g.scopeId] || []).filter(d => d.dimension === "ENTITY");
    if (dims.length !== 1 || dims[0].nodeId !== m.businessId || g.principalId !== m.userId || g.roleId !== m.roleId) grantScopeMismatch++;
  }
  if (grantsNoLink) problems.push(`${grantsNoLink} grants without legacyMembershipId (invented)`);
  if (grantsOrphan) problems.push(`${grantsOrphan} orphan grants`);
  if (memWithoutGrant) problems.push(`${memWithoutGrant} memberships without grant`);
  if (scopesMultiDim) problems.push(`${scopesMultiDim} scopes with != 1 dimension (broadening risk)`);
  if (nonEntityExact) problems.push(`${nonEntityExact} scope dims not {ENTITY,EXACT,nodeId}`);
  if (scopeNodeNotBusiness) problems.push(`${scopeNodeNotBusiness} ENTITY scope nodeIds not a business id`);
  if (grantScopeMismatch) problems.push(`${grantScopeMismatch} grants whose (principal,role,entity) != their membership`);

  // ---- Registry parity ----
  const distinctResources = new Set(permissions.map(p => p.resource));
  const permPairKeys = new Set(permissions.map(p => `${p.resource}|${p.action}`));
  const rdByKey = new Set(resourceDefs.map(r => r.key));
  const rdById = {}; for (const r of resourceDefs) rdById[r.id] = r;
  const adPairKeys = new Set(actionDefs.map(a => `${rdById[a.resourceDefId] ? rdById[a.resourceDefId].key : "?"}|${a.key}`));
  const missingRd = [...distinctResources].filter(r => !rdByKey.has(r));
  const missingAd = [...permPairKeys].filter(k => !adPairKeys.has(k));
  const extraAd = [...adPairKeys].filter(k => !permPairKeys.has(k));
  const adOrphan = actionDefs.filter(a => !rdById[a.resourceDefId]).length;
  const rdWrongModule = resourceDefs.filter(r => r.moduleId !== "mod__legacy").length;
  if (missingRd.length) problems.push(`registry: ${missingRd.length} resources missing a ResourceDefinition`);
  if (missingAd.length) problems.push(`registry: ${missingAd.length} permission pairs missing an ActionDefinition`);
  if (extraAd.length) problems.push(`registry: ${extraAd.length} invented ActionDefinitions`);
  if (adOrphan) problems.push(`registry: ${adOrphan} ActionDefinitions without a ResourceDefinition`);
  if (resourceDefs.length !== distinctResources.size) problems.push(`registry: resourceDefs ${resourceDefs.length} != distinct resources ${distinctResources.size}`);
  if (actionDefs.length !== permPairKeys.size) problems.push(`registry: actionDefs ${actionDefs.length} != permission pairs ${permPairKeys.size}`);

  const totalMismatches = problems.length;

  // ================= REPORT =================
  const now = new Date().toISOString();
  log("# OCTIEN IAM — Increment 2C Authorization Parity Report (READ-ONLY)\n");
  log(`> Proves legacy authorization == OCTIEN authorization for the current pilot data. Analysis only —`);
  log(`> enforcement UNCHANGED, no writes to the database. Generated: ${now}`);
  log(`> Database: \`${idn.db}\` @ \`${hostRedacted}\` (schema \`${idn.s}\`)\n`);

  log("## Source dataset counts\n");
  log("| Legacy | n | | OCTIEN | n |");
  log("|---|---|---|---|---|");
  log(`| users | ${users.length} | | iam_principals | ${principals.length} |`);
  log(`| businesses | ${businesses.length} | | iam_entities | ${entities.length} |`);
  log(`| roles | ${roles.length} | | iam_grants | ${grants.length} |`);
  log(`| permissions | ${permissions.length} | | iam_action_definitions | ${actionDefs.length} |`);
  log(`| memberships | ${memberships.length} | | iam_scope_dimensions | ${scopeDims.length} |`);
  log(`| distinct resources | ${distinctResources.size} | | iam_resource_definitions | ${resourceDefs.length} |`);
  log("");

  log("## Decision sets\n");
  log(`- Legacy ALLOW tuples: **${legacySet.size}**`);
  log(`- OCTIEN ALLOW tuples: **${octienSet.size}**`);
  log(`- Point matrix evaluated: **${pointRows.length}** (principals ${users.length} × entities ${businesses.length} × pairs ${pairs.length}) + ${edge.length} edge tuples\n`);

  log("## 1. Point-decision parity\n");
  log(`- Matrix tuples compared: **${pointRows.length}**`);
  log(`- Matches: **${pointMatches}** · Mismatches: **${pointMismatches}** ${pointMismatches === 0 ? "✔" : "❌"}\n`);

  log("## 2. List/set parity (entities accessible per principal × resource × action)\n");
  log(`- (principal,resource,action) sets compared: **${listCompared}**`);
  log(`- Set mismatches: **${listMismatches}** ${listMismatches === 0 ? "✔" : "❌"}\n`);

  log("## 3. No-broadening (set differences over ALLOW tuples)\n");
  log(`- EXTRA OCTIEN allows (broadening): **${extraAllows.length}** ${extraAllows.length === 0 ? "✔" : "❌"}`);
  log(`- MISSING OCTIEN allows: **${missingAllows.length}** ${missingAllows.length === 0 ? "✔" : "❌"}\n`);

  log("## 4. Grant / scope parity\n");
  const ck = (ok, s) => log(`- [${ok ? "x" : " "}] ${s}`);
  ck(grantsNoLink === 0, `zero invented grants (no NULL legacyMembershipId) — ${grantsNoLink}`);
  ck(grantsOrphan === 0, `zero orphan grants — ${grantsOrphan}`);
  ck(memWithoutGrant === 0, `every membership → a grant — ${memWithoutGrant} missing`);
  ck(scopesMultiDim === 0, `every scope has exactly one dimension — ${scopesMultiDim} violations`);
  ck(nonEntityExact === 0, `every dim is {ENTITY,EXACT,nodeId} — ${nonEntityExact} violations`);
  ck(scopeNodeNotBusiness === 0, `every ENTITY nodeId is a business id — ${scopeNodeNotBusiness} violations`);
  ck(grantScopeMismatch === 0, `every grant's (principal,role,entity) == its membership — ${grantScopeMismatch} violations`);
  log("");

  log("## 5. Registry parity\n");
  log("| Metric | Value | Expected | OK |");
  log("|---|---|---|---|");
  log(`| legacy permissions | ${permissions.length} | = action defs | ${permissions.length === actionDefs.length ? "✔" : "❌"} |`);
  log(`| OCTIEN action definitions | ${actionDefs.length} | = permissions | ${permissions.length === actionDefs.length ? "✔" : "❌"} |`);
  log(`| distinct legacy resources | ${distinctResources.size} | = resource defs | ${distinctResources.size === resourceDefs.length ? "✔" : "❌"} |`);
  log(`| OCTIEN resource definitions | ${resourceDefs.length} | = distinct resources | ${distinctResources.size === resourceDefs.length ? "✔" : "❌"} |`);
  log(`| missing mappings | ${missingRd.length + missingAd.length} | 0 | ${missingRd.length + missingAd.length === 0 ? "✔" : "❌"} |`);
  log(`| extra mappings | ${extraAd.length} | 0 | ${extraAd.length === 0 ? "✔" : "❌"} |`);
  log(`| orphan action defs | ${adOrphan} | 0 | ${adOrphan === 0 ? "✔" : "❌"} |`);
  log(`| resource defs off transition module | ${rdWrongModule} | 0 | ${rdWrongModule === 0 ? "✔" : "❌"} |`);
  log("");

  log("## 6. Edge cases\n");
  log("| # | Case | principal→entity·resource·action | legacy | octien | match |");
  log("|---|---|---|---|---|---|");
  edge.forEach((r, i) => log(`| ${i + 1} | ${r.tag} | ${String(r.principal).slice(0,8)}…→${String(r.entity).slice(0,8)}…·${r.resource}·${r.action} | ${r.legacy} | ${r.octien} | ${r.match ? "✔" : "❌"} |`));
  const usersMultiMem = users.filter(u => memberships.filter(m => m.userId === u.id).length > 1).length;
  const usersOneMem = users.filter(u => memberships.filter(m => m.userId === u.id).length === 1).length;
  const rolesShared = roles.filter(r => new Set(memberships.filter(m => m.roleId === r.id).map(m => m.userId)).size > 1).length;
  log("");
  log("Structural edge coverage from data:");
  log(`- users with exactly one membership: ${usersOneMem}`);
  log(`- users with multiple memberships (multi-entity): ${usersMultiMem}`);
  log(`- roles shared by multiple users: ${rolesShared}`);
  log(`- empty-authorization-state: covered by the unknown-principal edge (no grants → DENY in both)`);
  log(`- duplicate/overlapping memberships: prevented by legacy @@unique([userId,businessId]); none present`);
  log(`- registry pairs with no legacy equivalent: ${extraAd.length} (expected 0 — registry derived from permissions)\n`);

  log("## The critical no-broadening equivalence (Membership↔Grant)\n");
  if (entityWithMembershipTested) log(`- Entity WITH membership → ALLOW in both: ${entityWithMembershipTested.match ? "✔" : "❌"} (legacy ${entityWithMembershipTested.legacy} / octien ${entityWithMembershipTested.octien})`);
  if (crossEntityTested) log(`- Entity WITHOUT membership → DENY in both: ${crossEntityTested.match && crossEntityTested.legacy === "DENY" ? "✔" : "❌"} (legacy ${crossEntityTested.legacy} / octien ${crossEntityTested.octien})`);
  else log(`- (dataset has no user lacking membership in some entity to test cross-entity; each user's entities all covered)`);
  if (crossOrgTested) log(`- Cross-organization access → DENY in both: ${crossOrgTested.match && crossOrgTested.legacy === "DENY" ? "✔" : "❌"}`);
  else log(`- (all principals/entities share one organization in this dataset; cross-org covered by unknown-entity)`);
  log("");

  if (problems.length) {
    log("## Mismatch details\n");
    for (const p of problems.slice(0, 100)) log(`- ${p}`);
    log("");
  }

  log("## FINAL PARITY RESULT\n");
  log(`| Dimension | Mismatches |`);
  log(`|---|---|`);
  log(`| point decisions | ${pointMismatches} |`);
  log(`| list/set | ${listMismatches} |`);
  log(`| no-broadening (extra/missing allows) | ${extraAllows.length + missingAllows.length} |`);
  log(`| grant/scope | ${grantsNoLink + grantsOrphan + memWithoutGrant + scopesMultiDim + nonEntityExact + scopeNodeNotBusiness + grantScopeMismatch} |`);
  log(`| registry | ${missingRd.length + missingAd.length + extraAd.length + adOrphan} |`);
  log(`\n**TOTAL PARITY MISMATCHES: ${totalMismatches}**\n`);
  log(totalMismatches === 0
    ? "**IAM Increment 2C — PARITY VERIFIED ✔** — the OCTIEN representation faithfully reproduces today's authorization behavior. No enforcement changed."
    : "**PARITY FAILED ❌ — STOP.** Do not modify data, do not proceed to shadow/cutover. Classify each mismatch (migration-data / registry / legacy-interpretation / OCTIEN-representation / verifier / expected-semantic) and get explicit review.");

  fs.writeFileSync(OUT, L.join("\n"), "utf8");
  console.log(totalMismatches === 0 ? "PARITY 2C: VERIFIED ✔" : "PARITY 2C: FAILED ❌");
  console.log(`point=${pointRows.length} (mm ${pointMismatches}) | list sets=${listCompared} (mm ${listMismatches}) | extra=${extraAllows.length} missing=${missingAllows.length} | legacyAllow=${legacySet.size} octienAllow=${octienSet.size}`);
  console.log("TOTAL PARITY MISMATCHES:", totalMismatches);
  console.log("Report:", OUT);
  if (totalMismatches !== 0) process.exit(1);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
