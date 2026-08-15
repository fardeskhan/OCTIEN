/**
 * OCTIEN IAM — Increment 2B backfill runner (Authorization: registry + Membership→Grant).
 * Default: READ-ONLY dry-run. With --confirm: applies 003_backfill_2b.sql in ONE
 * transaction, records iam_migration_audit rows, then runs an internal idempotency probe.
 * GUARDS: every statement must be `INSERT INTO "iam_..."`; no DELETE/UPDATE/DROP/TRUNCATE.
 * On error: ROLLBACK, report, exit 1 (no retry). INERT DATA ONLY — no enforcement change.
 */
const fs = require("fs");
const path = require("path");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

const REPO = "D:/1/cosmyerp/COSMY-BOS";
const SQL_PATH = path.join(REPO, "packages/database/iam-migration/003_backfill_2b.sql");
const STEP_NAMES = ["modules", "resource_definitions", "action_definitions", "scopes", "scope_dimensions", "grants"];

function readDatabaseUrl() {
  const env = fs.readFileSync(path.join(REPO, ".env"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  let v = line.slice("DATABASE_URL=".length).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}
function parseStatements(sql) {
  const noComments = sql.split(/\r?\n/).filter((l) => !l.trim().startsWith("--")).join("\n");
  return noComments.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
}
async function scalar(client, q) { return Number((await client.query(q)).rows[0].n); }

async function main() {
  const confirm = process.argv.includes("--confirm");
  const url = readDatabaseUrl();
  const statements = parseStatements(fs.readFileSync(SQL_PATH, "utf8"));

  for (const s of statements) {
    if (!/^INSERT\s+INTO\s+"iam_/i.test(s)) throw new Error("Refused: non-(INSERT INTO iam_*) statement: " + s.slice(0, 80));
    if (/\b(DELETE|UPDATE|DROP|TRUNCATE|ALTER)\b/i.test(s.replace(/ON CONFLICT[\s\S]*$/i, "")))
      throw new Error("Refused: destructive keyword before ON CONFLICT: " + s.slice(0, 80));
  }
  if (statements.length !== 6) throw new Error(`Expected 6 statements, got ${statements.length}`);

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  await client.query("BEGIN"); await client.query("SET TRANSACTION READ ONLY");
  const pre = {
    permissions: await scalar(client, 'SELECT count(*)::int n FROM "permissions"'),
    memberships: await scalar(client, 'SELECT count(*)::int n FROM "memberships"'),
    roles: await scalar(client, 'SELECT count(*)::int n FROM "roles"'),
    iam_modules: await scalar(client, 'SELECT count(*)::int n FROM "iam_modules"'),
    iam_resource_definitions: await scalar(client, 'SELECT count(*)::int n FROM "iam_resource_definitions"'),
    iam_action_definitions: await scalar(client, 'SELECT count(*)::int n FROM "iam_action_definitions"'),
    iam_scopes: await scalar(client, 'SELECT count(*)::int n FROM "iam_scopes"'),
    iam_scope_dimensions: await scalar(client, 'SELECT count(*)::int n FROM "iam_scope_dimensions"'),
    iam_grants: await scalar(client, 'SELECT count(*)::int n FROM "iam_grants"'),
  };
  const projected = {
    modules: await scalar(client, `SELECT (CASE WHEN EXISTS (SELECT 1 FROM "iam_modules" WHERE "id"='mod__legacy') THEN 0 ELSE 1 END)::int n`),
    resource_definitions: await scalar(client, `SELECT count(*)::int n FROM (SELECT DISTINCT "resource" r FROM "permissions") x WHERE NOT EXISTS (SELECT 1 FROM "iam_resource_definitions" rd WHERE rd."id"='rd__'||x.r)`),
    action_definitions: await scalar(client, `SELECT count(*)::int n FROM (SELECT DISTINCT "resource" r, "action" a FROM "permissions") x WHERE NOT EXISTS (SELECT 1 FROM "iam_action_definitions" ad WHERE ad."id"='ad__'||x.r||'__'||x.a)`),
    scopes: await scalar(client, `SELECT count(*)::int n FROM "memberships" m WHERE NOT EXISTS (SELECT 1 FROM "iam_scopes" s WHERE s."id"='scope__'||m."id")`),
    scope_dimensions: await scalar(client, `SELECT count(*)::int n FROM "memberships" m WHERE NOT EXISTS (SELECT 1 FROM "iam_scope_dimensions" sd WHERE sd."id"='sd__'||m."id")`),
    grants: await scalar(client, `SELECT count(*)::int n FROM "memberships" m WHERE NOT EXISTS (SELECT 1 FROM "iam_grants" g WHERE g."id"='grant__'||m."id")`),
  };
  await client.query("ROLLBACK");

  console.log("=== DRY-RUN (read-only) ===");
  console.log("pre-counts:", JSON.stringify(pre));
  console.log("projected inserts:", JSON.stringify(projected));

  if (!confirm) { console.log("\nNo --confirm flag → dry-run only. Nothing written."); client.release(); await pool.end(); return; }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const inserted = {};
  try {
    await client.query("BEGIN"); await client.query("SET TRANSACTION READ WRITE");
    for (let i = 0; i < statements.length; i++) inserted[STEP_NAMES[i]] = (await client.query(statements[i])).rowCount || 0;
    for (let i = 0; i < STEP_NAMES.length; i++) {
      await client.query(
        `INSERT INTO "iam_migration_audit" ("id","step","finishedAt","rowsAffected","status","notes")
         VALUES ($1,$2, now(), $3, 'COMPLETED', $4)`,
        [`2b__${STEP_NAMES[i]}__${runId}`, `2B:${STEP_NAMES[i]}`, inserted[STEP_NAMES[i]], "Increment 2B authorization backfill"]
      );
    }
    await client.query("COMMIT");
    console.log("\n=== APPLY (committed) ===");
    console.log("inserted this run:", JSON.stringify(inserted));
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("BACKFILL FAILED — ROLLED BACK. No retry.");
    console.error("Error:", err.message);
    client.release(); await pool.end(); process.exit(1);
  }

  const probe = {};
  await client.query("BEGIN"); await client.query("SET TRANSACTION READ WRITE");
  for (let i = 0; i < statements.length; i++) probe[STEP_NAMES[i]] = (await client.query(statements[i])).rowCount || 0;
  await client.query("ROLLBACK");
  const probeZero = Object.values(probe).every((n) => n === 0);
  console.log("\n=== IDEMPOTENCY PROBE (re-run inserts in a rolled-back txn) ===");
  console.log("rows the re-run would insert:", JSON.stringify(probe), probeZero ? "→ ALL ZERO ✔" : "→ NON-ZERO ❌");

  client.release(); await pool.end();
  if (!probeZero) process.exit(1);
  console.log("\nDONE. Run verify_backfill_2b.js next (read-only).");
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
