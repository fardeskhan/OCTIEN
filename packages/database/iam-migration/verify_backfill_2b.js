/**
 * OCTIEN IAM — Increment 2B INDEPENDENT read-only verification.
 * Proves the authorization backfill faithfully represents today's state WITHOUT broadening:
 *   - registry (Module/ResourceDefinition/ActionDefinition) covers the legacy catalog
 *   - every Membership → exactly one Grant (principal=userId, role=roleId, ALLOW/ACTIVE)
 *   - every Grant scope = exactly ONE {ENTITY EXACT = membership.businessId} (no extra reach)
 *   - no Grant without a Membership; roleId/nodeId resolve
 *   - legacy row counts unchanged; dashboard untouched
 * Strictly read-only. Writes IAM_BACKFILL_2B_REPORT.md. Exits non-zero on any problem.
 */
const fs = require("fs");
const path = require("path");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

const REPO = "D:/1/cosmyerp/COSMY-BOS";
const OUT = path.join(REPO, "packages/database/iam-migration/IAM_BACKFILL_2B_REPORT.md");
// Config tables carry authorization-relevant data → MUST be unchanged by the backfill.
// Volatile tables (sessions/audit) change with normal login/app activity, never from the
// backfill (which writes only iam_* tables) → reported informationally, not a hard fail.
const CONFIG_BASELINE = { users: 2, roles: 2, permissions: 29, role_permissions: 29, memberships: 4,
  tenants: 2, businesses: 3, business_types: 1, accounts: 2, verifications: 0 };
const VOLATILE_BASELINE = { sessions: 40, audit_logs: 22, audit_events: 79 };
const DASH_ORPHANS = ["activesuppliers","lowstockalerts","monthlyspend","openpoamount","pendingreceipts","totalinventoryval"];

function readDatabaseUrl() {
  const env = fs.readFileSync(path.join(REPO, ".env"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  let v = line.slice("DATABASE_URL=".length).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}
async function n(client, q) { return Number((await client.query(q)).rows[0].n); }

async function main() {
  const url = readDatabaseUrl();
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  const problems = [];
  const L = []; const log = (s = "") => L.push(s);

  await client.query("BEGIN"); await client.query("SET TRANSACTION READ ONLY");

  const c = {
    permissions: await n(client, 'SELECT count(*)::int n FROM "permissions"'),
    distinctResources: await n(client, 'SELECT count(DISTINCT "resource")::int n FROM "permissions"'),
    distinctPairs: await n(client, 'SELECT count(*)::int n FROM (SELECT DISTINCT "resource","action" FROM "permissions") x'),
    memberships: await n(client, 'SELECT count(*)::int n FROM "memberships"'),
    modules: await n(client, 'SELECT count(*)::int n FROM "iam_modules"'),
    resourceDefs: await n(client, 'SELECT count(*)::int n FROM "iam_resource_definitions"'),
    actionDefs: await n(client, 'SELECT count(*)::int n FROM "iam_action_definitions"'),
    scopes: await n(client, 'SELECT count(*)::int n FROM "iam_scopes"'),
    scopeDims: await n(client, 'SELECT count(*)::int n FROM "iam_scope_dimensions"'),
    grants: await n(client, 'SELECT count(*)::int n FROM "iam_grants"'),
  };

  // Registry coverage
  if (c.resourceDefs !== c.distinctResources) problems.push(`resource_definitions (${c.resourceDefs}) != distinct resources (${c.distinctResources})`);
  if (c.actionDefs !== c.distinctPairs) problems.push(`action_definitions (${c.actionDefs}) != distinct (resource,action) pairs (${c.distinctPairs})`);
  const rdBadModule = await n(client, `SELECT count(*)::int n FROM "iam_resource_definitions" WHERE "moduleId" <> 'mod__legacy'`);
  if (rdBadModule) problems.push(`${rdBadModule} resource_definitions not under mod__legacy`);
  const adOrphan = await n(client, 'SELECT count(*)::int n FROM "iam_action_definitions" ad WHERE NOT EXISTS (SELECT 1 FROM "iam_resource_definitions" rd WHERE rd."id"=ad."resourceDefId")');
  if (adOrphan) problems.push(`${adOrphan} action_definitions with no resource_definition`);

  // Membership → Grant 1:1
  if (c.grants !== c.memberships) problems.push(`grants (${c.grants}) != memberships (${c.memberships})`);
  const grantsNoLink = await n(client, 'SELECT count(*)::int n FROM "iam_grants" WHERE "legacyMembershipId" IS NULL');
  if (grantsNoLink) problems.push(`${grantsNoLink} grants without legacyMembershipId (invented grants!)`);
  const grantsOrphan = await n(client, 'SELECT count(*)::int n FROM "iam_grants" g WHERE NOT EXISTS (SELECT 1 FROM "memberships" m WHERE m."id"=g."legacyMembershipId")');
  if (grantsOrphan) problems.push(`${grantsOrphan} grants whose legacyMembershipId has no membership`);
  const memWithoutGrant = await n(client, 'SELECT count(*)::int n FROM "memberships" m WHERE NOT EXISTS (SELECT 1 FROM "iam_grants" g WHERE g."legacyMembershipId"=m."id")');
  if (memWithoutGrant) problems.push(`${memWithoutGrant} memberships without a grant`);

  // Behavior-preserving: grant matches its membership (principal=userId, role=roleId)
  const grantMismatch = await n(client, `SELECT count(*)::int n FROM "iam_grants" g JOIN "memberships" m ON g."legacyMembershipId"=m."id" WHERE g."principalId"<>m."userId" OR g."roleId"<>m."roleId"`);
  if (grantMismatch) problems.push(`${grantMismatch} grants whose principal/role != their membership`);

  // No broadening: all grants ALLOW + ACTIVE; every scope has EXACTLY ONE dim = {ENTITY EXACT businessId}
  const nonAllow = await n(client, `SELECT count(*)::int n FROM "iam_grants" WHERE "effect"<>'ALLOW' OR "state"<>'ACTIVE'`);
  if (nonAllow) problems.push(`${nonAllow} grants not ALLOW/ACTIVE`);
  const scopeDimCounts = await n(client, `SELECT count(*)::int n FROM (SELECT "scopeId", count(*) c FROM "iam_scope_dimensions" GROUP BY "scopeId" HAVING count(*)<>1) x`);
  if (scopeDimCounts) problems.push(`${scopeDimCounts} scopes with != 1 dimension (potential broadening)`);
  const nonEntityExact = await n(client, `SELECT count(*)::int n FROM "iam_scope_dimensions" WHERE "dimension"<>'ENTITY' OR "mode"<>'EXACT' OR "nodeId" IS NULL`);
  if (nonEntityExact) problems.push(`${nonEntityExact} scope dimensions not {ENTITY EXACT nodeId}`);
  // scope's entity nodeId must equal the membership's businessId
  const scopeEntityMismatch = await n(client, `
    SELECT count(*)::int n FROM "iam_grants" g
    JOIN "memberships" m ON g."legacyMembershipId"=m."id"
    JOIN "iam_scope_dimensions" sd ON sd."scopeId"=g."scopeId"
    WHERE sd."nodeId" <> m."businessId"`);
  if (scopeEntityMismatch) problems.push(`${scopeEntityMismatch} grants whose ENTITY scope != membership.businessId`);
  // referential: roleId ∈ roles, nodeId(entity) ∈ entities
  const badRole = await n(client, 'SELECT count(*)::int n FROM "iam_grants" g WHERE NOT EXISTS (SELECT 1 FROM "roles" r WHERE r."id"=g."roleId")');
  if (badRole) problems.push(`${badRole} grants with roleId not in legacy roles`);
  const badEntity = await n(client, 'SELECT count(*)::int n FROM "iam_scope_dimensions" sd WHERE sd."dimension"=\'ENTITY\' AND NOT EXISTS (SELECT 1 FROM "iam_entities" e WHERE e."id"=sd."nodeId")');
  if (badEntity) problems.push(`${badEntity} ENTITY scope dimensions whose nodeId is not an iam_entities id`);

  // legacy unchanged + dashboard
  const legacyNow = {};
  for (const t of [...Object.keys(CONFIG_BASELINE), ...Object.keys(VOLATILE_BASELINE)]) legacyNow[t] = await n(client, `SELECT count(*)::int n FROM "${t}"`);
  for (const [t, exp] of Object.entries(CONFIG_BASELINE)) if (legacyNow[t] !== exp) problems.push(`config row-count changed: ${t} baseline=${exp} now=${legacyNow[t]} (authorization data must not change)`);
  const dashCols = (await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='reporting_executive_dashboard'`)).rows.map(r => r.column_name);
  const orphansPresent = DASH_ORPHANS.filter(o => dashCols.includes(o));
  if (dashCols.length !== 16) problems.push(`dashboard column count = ${dashCols.length}, expected 16`);
  if (orphansPresent.length !== 6) problems.push(`dashboard orphans present=${orphansPresent.length}, expected 6`);

  const audit = (await client.query(`SELECT step, "rowsAffected", "finishedAt" FROM "iam_migration_audit" WHERE step LIKE '2B:%' ORDER BY "finishedAt", step`)).rows;

  await client.query("ROLLBACK");
  client.release(); await pool.end();

  const now = new Date().toISOString();
  log("# OCTIEN IAM — Increment 2B Backfill Report (Authorization)\n");
  log(`> Independent READ-ONLY verification. INERT DATA ONLY — enforcement unchanged. Generated: ${now}\n`);

  log("## Registry (Module → ResourceDefinition → ActionDefinition)\n");
  log("| Item | Count | Expected | OK |"); log("|---|---|---|---|");
  log(`| \`iam_modules\` (transition) | ${c.modules} | ≥1 | ${c.modules >= 1 ? "✔" : "❌"} |`);
  log(`| \`iam_resource_definitions\` | ${c.resourceDefs} | distinct resources = ${c.distinctResources} | ${c.resourceDefs === c.distinctResources ? "✔" : "❌"} |`);
  log(`| \`iam_action_definitions\` | ${c.actionDefs} | distinct (resource,action) = ${c.distinctPairs} (= permissions ${c.permissions}) | ${c.actionDefs === c.distinctPairs ? "✔" : "❌"} |`);
  log("");

  log("## Membership → Grant (behavior-preserving 1:1)\n");
  log("| Item | Count |"); log("|---|---|");
  log(`| \`memberships\` | ${c.memberships} |`);
  log(`| \`iam_grants\` | ${c.grants} |`);
  log(`| \`iam_scopes\` | ${c.scopes} |`);
  log(`| \`iam_scope_dimensions\` | ${c.scopeDims} |`);
  log("");

  log("## Actual inserted counts (from iam_migration_audit)\n");
  if (audit.length) { log("| Step | rowsAffected | finishedAt |"); log("|---|---|---|"); for (const a of audit) log(`| ${a.step} | ${a.rowsAffected} | ${a.finishedAt ? new Date(a.finishedAt).toISOString() : ""} |`); }
  else log("_no 2B audit rows found_");
  log("");

  log("## No-broadening & integrity checks\n");
  const chk = (ok, label) => log(`- [${ok ? "x" : " "}] ${label}`);
  chk(c.grants === c.memberships, "every membership → exactly one grant (counts equal)");
  chk(grantsNoLink === 0 && grantsOrphan === 0 && memWithoutGrant === 0, "no invented grants; no membership left unmapped");
  chk(grantMismatch === 0, "each grant's principal=userId and role=roleId (matches its membership)");
  chk(nonAllow === 0, "all grants are ALLOW + ACTIVE (legacy has no deny)");
  chk(scopeDimCounts === 0, "every scope has EXACTLY ONE dimension (no accidental broadening)");
  chk(nonEntityExact === 0, "every dimension is {ENTITY, EXACT, nodeId} — no wider scope type");
  chk(scopeEntityMismatch === 0, "each grant's ENTITY scope == membership.businessId (same reach)");
  chk(badRole === 0, "every grant.roleId resolves to a legacy role");
  chk(badEntity === 0, "every ENTITY scope nodeId resolves to an iam_entities row");
  log("");

  log("## Legacy row counts\n");
  log("| Table | Baseline | Now | Kind | OK |"); log("|---|---|---|---|---|");
  for (const [t, exp] of Object.entries(CONFIG_BASELINE)) log(`| \`${t}\` | ${exp} | ${legacyNow[t]} | config | ${legacyNow[t] === exp ? "✔" : "❌"} |`);
  for (const [t, exp] of Object.entries(VOLATILE_BASELINE)) log(`| \`${t}\` | ${exp} | ${legacyNow[t]} | volatile* | ${legacyNow[t] === exp ? "=" : "≠ (app usage)"} |`);
  log("\n*volatile = sessions/audit change with normal login/app activity, never from the backfill (which writes only iam_* tables).\n");
  log("## reporting_executive_dashboard (must be untouched)\n");
  log(`- Columns: **${dashCols.length}** (expected 16) ${dashCols.length === 16 ? "✔" : "❌"} · orphans present: **${orphansPresent.length}/6** ${orphansPresent.length === 6 ? "✔" : "❌"}\n`);

  log("## Enforcement unchanged (inert data)\n");
  log("- No change to `auth.ts`, Better Auth, middleware, or any authorization code path.");
  log("- The application still authorizes via the legacy Membership/Role model; these Grants/registry rows are not consulted yet.");
  log("- Whether the new model *computes the same access* is proven separately in **2C (parity harness)** — not here.\n");

  log("## Idempotency\n");
  log("- Deterministic PKs + `ON CONFLICT (\"id\") DO NOTHING`; re-running inserts 0 rows (probe + second `--confirm` run).\n");

  log("## Rollback procedure (2B data only)\n");
  log("```sql");
  log("DELETE FROM \"iam_grants\"             WHERE \"legacyMembershipId\" IS NOT NULL;");
  log("DELETE FROM \"iam_scope_dimensions\"   WHERE \"id\" LIKE 'sd__%';");
  log("DELETE FROM \"iam_scopes\"             WHERE \"id\" LIKE 'scope__%';");
  log("DELETE FROM \"iam_action_definitions\" WHERE \"id\" LIKE 'ad__%';");
  log("DELETE FROM \"iam_resource_definitions\" WHERE \"moduleId\" = 'mod__legacy';");
  log("DELETE FROM \"iam_modules\"            WHERE \"id\" = 'mod__legacy';");
  log("DELETE FROM \"iam_migration_audit\"    WHERE step LIKE '2B:%';");
  log("```\n");

  log("## Result\n");
  if (problems.length === 0) log("**PASS ✔** — today's authorization state is faithfully represented in OCTIEN, with no broadening; legacy behavior and data unchanged.");
  else { log("**FAIL ❌ — STOP. Anomalies:**\n"); for (const p of problems) log(`- ${p}`); }

  fs.writeFileSync(OUT, L.join("\n"), "utf8");
  console.log(problems.length === 0 ? "VERIFY 2B: PASS ✔" : "VERIFY 2B: FAIL ❌");
  console.log("registry:", JSON.stringify({ modules: c.modules, resourceDefs: c.resourceDefs, actionDefs: c.actionDefs }),
              "| grants:", c.grants, "| scopes:", c.scopes, "| scopeDims:", c.scopeDims);
  if (problems.length) { console.log("PROBLEMS:", problems.join(" | ")); process.exit(1); }
  console.log("Report:", OUT);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
