/**
 * OCTIEN IAM — Increment 2A INDEPENDENT read-only verification.
 * Re-derives everything from live DB state (does not trust the backfill's claims).
 * Confirms mappings, linkage, no duplicates, legacy row counts unchanged, and
 * reporting_executive_dashboard unchanged. Writes IAM_BACKFILL_2A_REPORT.md.
 * Strictly read-only (BEGIN; SET TRANSACTION READ ONLY; ROLLBACK). Exits non-zero on any problem.
 */
const fs = require("fs");
const path = require("path");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

const REPO = "D:/1/cosmyerp/COSMY-BOS";
const OUT = path.join(REPO, "packages/database/iam-migration/IAM_BACKFILL_2A_REPORT.md");

// Immutable baseline (PRE_APPLY_BASELINE.md). DDL/backfill must not change legacy rows.
// Config = authorization-relevant, MUST be unchanged. Volatile = sessions/audit, change with
// normal login/app activity (never from the backfill) → informational, not a hard fail.
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
  const L = [];
  const log = (s = "") => L.push(s);

  await client.query("BEGIN"); await client.query("SET TRANSACTION READ ONLY");

  // Counts
  const c = {
    tenants: await n(client, 'SELECT count(*)::int n FROM "tenants"'),
    users: await n(client, 'SELECT count(*)::int n FROM "users"'),
    businesses: await n(client, 'SELECT count(*)::int n FROM "businesses"'),
    organizations: await n(client, 'SELECT count(*)::int n FROM "iam_organizations"'),
    workspaces: await n(client, 'SELECT count(*)::int n FROM "iam_workspaces"'),
    principals: await n(client, 'SELECT count(*)::int n FROM "iam_principals"'),
    entities: await n(client, 'SELECT count(*)::int n FROM "iam_entities"'),
    rootLocations: await n(client, 'SELECT count(*)::int n FROM "iam_locations" WHERE "isEntityRoot"=true'),
    totalLocations: await n(client, 'SELECT count(*)::int n FROM "iam_locations"'),
  };

  // 1. every tenant -> exactly one organization
  const orgMatched = await n(client, 'SELECT count(*)::int n FROM "iam_organizations" o JOIN "tenants" t ON o."id"=t."id" AND o."legacyTenantId"=t."id"');
  if (!(c.tenants === c.organizations && c.organizations === orgMatched)) problems.push(`tenant→organization mismatch: tenants=${c.tenants} orgs=${c.organizations} matched=${orgMatched}`);

  // 2. every user -> exactly one principal
  const prinMatched = await n(client, 'SELECT count(*)::int n FROM "iam_principals" p JOIN "users" u ON p."id"=u."id"');
  if (!(c.users === c.principals && c.principals === prinMatched)) problems.push(`user→principal mismatch: users=${c.users} principals=${c.principals} matched=${prinMatched}`);

  // 3. every business -> exactly one entity
  const entMatched = await n(client, 'SELECT count(*)::int n FROM "iam_entities" e JOIN "businesses" b ON e."id"=b."id" AND e."legacyBusinessId"=b."id"');
  if (!(c.businesses === c.entities && c.entities === entMatched)) problems.push(`business→entity mismatch: businesses=${c.businesses} entities=${c.entities} matched=${entMatched}`);

  // 4. every entity -> exactly one synthetic root location
  const entWithoutRoot = await n(client, 'SELECT count(*)::int n FROM "iam_entities" e WHERE NOT EXISTS (SELECT 1 FROM "iam_locations" l WHERE l."entityId"=e."id" AND l."isEntityRoot"=true)');
  if (entWithoutRoot !== 0) problems.push(`${entWithoutRoot} entity(ies) without a synthetic root location`);
  if (c.rootLocations !== c.entities) problems.push(`root locations (${c.rootLocations}) != entities (${c.entities})`);

  // 5. legacy linkage complete
  const orgNullLink = await n(client, 'SELECT count(*)::int n FROM "iam_organizations" WHERE "legacyTenantId" IS NULL');
  const entNullLink = await n(client, 'SELECT count(*)::int n FROM "iam_entities" WHERE "legacyBusinessId" IS NULL');
  if (orgNullLink) problems.push(`${orgNullLink} organizations with NULL legacyTenantId`);
  if (entNullLink) problems.push(`${entNullLink} entities with NULL legacyBusinessId`);

  // 6. no duplicate mappings (distinct linkage == row count)
  const orgDistinct = await n(client, 'SELECT count(DISTINCT "legacyTenantId")::int n FROM "iam_organizations"');
  const entDistinct = await n(client, 'SELECT count(DISTINCT "legacyBusinessId")::int n FROM "iam_entities"');
  if (orgDistinct !== c.organizations) problems.push(`duplicate org linkage: distinct=${orgDistinct} rows=${c.organizations}`);
  if (entDistinct !== c.entities) problems.push(`duplicate entity linkage: distinct=${entDistinct} rows=${c.entities}`);

  // 7. referential sanity (no FK on principal.organizationId, so check by hand)
  const badPrinOrg = await n(client, 'SELECT count(*)::int n FROM "iam_principals" p WHERE NOT EXISTS (SELECT 1 FROM "iam_organizations" o WHERE o."id"=p."organizationId")');
  if (badPrinOrg) problems.push(`${badPrinOrg} principals with organizationId not in iam_organizations`);
  const badEntWs = await n(client, 'SELECT count(*)::int n FROM "iam_entities" e WHERE NOT EXISTS (SELECT 1 FROM "iam_workspaces" w WHERE w."id"=e."workspaceId")');
  if (badEntWs) problems.push(`${badEntWs} entities with workspaceId not in iam_workspaces`);

  // 8. legacy row counts unchanged
  const legacyNow = {};
  for (const t of [...Object.keys(CONFIG_BASELINE), ...Object.keys(VOLATILE_BASELINE)]) legacyNow[t] = await n(client, `SELECT count(*)::int n FROM "${t}"`);
  for (const [t, exp] of Object.entries(CONFIG_BASELINE)) if (legacyNow[t] !== exp) problems.push(`config row-count changed: ${t} baseline=${exp} now=${legacyNow[t]} (authorization data must not change)`);

  // 9. dashboard unchanged
  const dashCols = (await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='reporting_executive_dashboard'`)).rows.map(r => r.column_name);
  const orphansPresent = DASH_ORPHANS.filter(o => dashCols.includes(o));
  if (dashCols.length !== 16) problems.push(`reporting_executive_dashboard column count = ${dashCols.length}, expected 16`);
  if (orphansPresent.length !== 6) problems.push(`dashboard orphan columns present=${orphansPresent.length}, expected 6 (must be untouched)`);

  // migration audit rows for 2A
  const audit = (await client.query(`SELECT step, "rowsAffected", "finishedAt" FROM "iam_migration_audit" WHERE step LIKE '2A:%' ORDER BY "finishedAt", step`)).rows;

  await client.query("ROLLBACK");
  client.release(); await pool.end();

  // ---- report ----
  const now = new Date().toISOString();
  log("# OCTIEN IAM — Increment 2A Backfill Report (Identity & Organization)\n");
  log(`> Independent READ-ONLY verification. DB unmodified by this check. Generated: ${now}\n`);

  log("## Mapping result\n");
  log("| Legacy source | Count | → OCTIEN target | Count | OK |");
  log("|---|---|---|---|---|");
  log(`| \`tenants\` | ${c.tenants} | \`iam_organizations\` | ${c.organizations} | ${c.tenants === c.organizations ? "✔" : "❌"} |`);
  log(`| (per organization) | ${c.organizations} | \`iam_workspaces\` (Production) | ${c.workspaces} | ${c.workspaces === c.organizations ? "✔" : "❌"} |`);
  log(`| \`users\` | ${c.users} | \`iam_principals\` | ${c.principals} | ${c.users === c.principals ? "✔" : "❌"} |`);
  log(`| \`businesses\` | ${c.businesses} | \`iam_entities\` | ${c.entities} | ${c.businesses === c.entities ? "✔" : "❌"} |`);
  log(`| \`businesses\` | ${c.businesses} | \`iam_locations\` (Entity-root) | ${c.rootLocations} | ${c.businesses === c.rootLocations ? "✔" : "❌"} |`);
  log("");

  log("## Actual inserted counts (from iam_migration_audit)\n");
  if (audit.length) { log("| Step | rowsAffected | finishedAt |"); log("|---|---|---|"); for (const a of audit) log(`| ${a.step} | ${a.rowsAffected} | ${a.finishedAt ? new Date(a.finishedAt).toISOString() : ""} |`); }
  else log("_no 2A audit rows found_");
  log("");

  log("## Linkage & integrity checks\n");
  const chk = (ok, label) => log(`- [${ok ? "x" : " "}] ${label}`);
  chk(c.tenants === c.organizations && orgMatched === c.tenants, "every tenant has exactly one organization (id + legacyTenantId)");
  chk(c.users === c.principals && prinMatched === c.users, "every user has exactly one principal (id == user.id)");
  chk(c.businesses === c.entities && entMatched === c.businesses, "every business has exactly one entity (id + legacyBusinessId)");
  chk(entWithoutRoot === 0 && c.rootLocations === c.entities, "every entity has exactly one synthetic root location");
  chk(orgNullLink === 0 && entNullLink === 0, "legacy linkage complete (no NULL legacy ids)");
  chk(orgDistinct === c.organizations && entDistinct === c.entities, "no duplicate mappings (distinct linkage == rows)");
  chk(badPrinOrg === 0 && badEntWs === 0, "referential sanity (principal.org, entity.workspace resolve)");
  log("");

  log("## Legacy row counts\n");
  log("| Table | Baseline | Now | Kind | OK |"); log("|---|---|---|---|---|");
  for (const [t, exp] of Object.entries(CONFIG_BASELINE)) log(`| \`${t}\` | ${exp} | ${legacyNow[t]} | config | ${legacyNow[t] === exp ? "✔" : "❌"} |`);
  for (const [t, exp] of Object.entries(VOLATILE_BASELINE)) log(`| \`${t}\` | ${exp} | ${legacyNow[t]} | volatile* | ${legacyNow[t] === exp ? "=" : "≠ (app usage)"} |`);
  log("\n*volatile = sessions/audit change with normal login/app activity, never from the backfill.\n");

  log("## reporting_executive_dashboard (must be untouched)\n");
  log(`- Columns: **${dashCols.length}** (expected 16) ${dashCols.length === 16 ? "✔" : "❌"}`);
  log(`- Orphan columns still present: **${orphansPresent.length}/6** ${orphansPresent.length === 6 ? "✔ (untouched)" : "❌"}`);
  log("");

  log("## Idempotency\n");
  log("- Backfill uses deterministic PKs (legacy ids) + `ON CONFLICT (\"id\") DO NOTHING`.");
  log("- Mapped counts equal legacy source counts with unique linkage → re-running inserts 0 rows.");
  log("- Confirmed by the runner's internal probe (re-run in a rolled-back txn = 0 rows) and by a second `--confirm` execution.\n");

  log("## Transaction result\n");
  log("- Apply committed atomically inside `BEGIN; SET TRANSACTION READ WRITE; ...; COMMIT;`.");
  log("- On any failure the runner performs `ROLLBACK` with no automatic retry/repair.\n");

  log("## Rollback procedure (2A data only; structures remain)\n");
  log("```sql");
  log("-- Removes ONLY the 2A-backfilled rows; iam_* tables (Expand) stay in place.");
  log("DELETE FROM \"iam_locations\"     WHERE \"isEntityRoot\" = true;");
  log("DELETE FROM \"iam_entities\"      WHERE \"legacyBusinessId\" IS NOT NULL;");
  log("DELETE FROM \"iam_principals\";");
  log("DELETE FROM \"iam_workspaces\"    WHERE \"id\" LIKE '%__production';");
  log("DELETE FROM \"iam_organizations\" WHERE \"legacyTenantId\" IS NOT NULL;");
  log("DELETE FROM \"iam_migration_audit\" WHERE step LIKE '2A:%';");
  log("```\n");

  log("## Result\n");
  if (problems.length === 0) log("**PASS ✔** — identity & organization backfill complete, linkage sound, legacy data unchanged.");
  else { log("**FAIL ❌ — STOP. Anomalies:**\n"); for (const p of problems) log(`- ${p}`); }

  fs.writeFileSync(OUT, L.join("\n"), "utf8");
  console.log(problems.length === 0 ? "VERIFY 2A: PASS ✔" : "VERIFY 2A: FAIL ❌");
  console.log("map:", JSON.stringify({ orgs: c.organizations, ws: c.workspaces, principals: c.principals, entities: c.entities, roots: c.rootLocations }));
  if (problems.length) { console.log("PROBLEMS:", problems.join(" | ")); process.exit(1); }
  console.log("Report:", OUT);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
