/**
 * OCTIEN IAM — Increment 2A backfill runner.
 * Default (no flag): READ-ONLY dry-run (pre-counts + projected inserts). No writes.
 * With --confirm: applies 002_backfill_2a.sql in ONE transaction, records
 *   iam_migration_audit rows, then runs an internal idempotency probe (re-executes
 *   the inserts in a SECOND transaction and asserts 0 rows, ROLLBACK).
 *
 * GUARDS: every statement must be `INSERT INTO "iam_..."`; refuses on any
 *   DELETE/UPDATE/DROP/TRUNCATE. On any error: ROLLBACK, report, exit 1 (no retry).
 *
 * Usage:
 *   dry-run: NODE_PATH=<repo>/node_modules node .../backfill_2a.js
 *   apply:   NODE_PATH=<repo>/node_modules node .../backfill_2a.js --confirm
 */
const fs = require("fs");
const path = require("path");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

const REPO = "D:/1/cosmyerp/COSMY-BOS";
const SQL_PATH = path.join(REPO, "packages/database/iam-migration/002_backfill_2a.sql");
const STEP_NAMES = ["organizations", "workspaces", "principals", "entities", "locations"];

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

  // GUARD — writes must target iam_* only; no destructive DML/DDL.
  for (const s of statements) {
    if (!/^INSERT\s+INTO\s+"iam_/i.test(s)) throw new Error("Refused: non-(INSERT INTO iam_*) statement: " + s.slice(0, 80));
    if (/\b(DELETE|UPDATE|DROP|TRUNCATE|ALTER)\b/i.test(s.replace(/ON CONFLICT[\s\S]*$/i, "")))
      throw new Error("Refused: destructive keyword before ON CONFLICT: " + s.slice(0, 80));
  }
  if (statements.length !== 5) throw new Error(`Expected 5 statements, got ${statements.length}`);

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  // ---- READ-ONLY dry-run: pre-counts + projected (from legacy sources) ----
  await client.query("BEGIN"); await client.query("SET TRANSACTION READ ONLY");
  const pre = {
    tenants: await scalar(client, 'SELECT count(*)::int n FROM "tenants"'),
    users: await scalar(client, 'SELECT count(*)::int n FROM "users"'),
    businesses: await scalar(client, 'SELECT count(*)::int n FROM "businesses"'),
    iam_organizations: await scalar(client, 'SELECT count(*)::int n FROM "iam_organizations"'),
    iam_workspaces: await scalar(client, 'SELECT count(*)::int n FROM "iam_workspaces"'),
    iam_principals: await scalar(client, 'SELECT count(*)::int n FROM "iam_principals"'),
    iam_entities: await scalar(client, 'SELECT count(*)::int n FROM "iam_entities"'),
    iam_locations: await scalar(client, 'SELECT count(*)::int n FROM "iam_locations"'),
  };
  const projected = {
    organizations: await scalar(client, 'SELECT count(*)::int n FROM "tenants" t WHERE NOT EXISTS (SELECT 1 FROM "iam_organizations" o WHERE o."id"=t."id")'),
    workspaces: await scalar(client, `SELECT count(*)::int n FROM "tenants" t WHERE NOT EXISTS (SELECT 1 FROM "iam_workspaces" w WHERE w."id"=t."id"||'__production')`),
    principals: await scalar(client, 'SELECT count(*)::int n FROM "users" u WHERE NOT EXISTS (SELECT 1 FROM "iam_principals" p WHERE p."id"=u."id")'),
    entities: await scalar(client, 'SELECT count(*)::int n FROM "businesses" b WHERE NOT EXISTS (SELECT 1 FROM "iam_entities" e WHERE e."id"=b."id")'),
    locations: await scalar(client, `SELECT count(*)::int n FROM "businesses" b WHERE NOT EXISTS (SELECT 1 FROM "iam_locations" l WHERE l."id"=b."id"||'__root')`),
  };
  await client.query("ROLLBACK");

  console.log("=== DRY-RUN (read-only) ===");
  console.log("pre-counts:", JSON.stringify(pre));
  console.log("projected inserts:", JSON.stringify(projected));

  if (!confirm) {
    console.log("\nNo --confirm flag → dry-run only. Nothing written.");
    client.release(); await pool.end();
    return;
  }

  // ---- APPLY (transaction 1) ----
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const inserted = {};
  try {
    await client.query("BEGIN"); await client.query("SET TRANSACTION READ WRITE");
    for (let i = 0; i < statements.length; i++) {
      const res = await client.query(statements[i]);
      inserted[STEP_NAMES[i]] = res.rowCount || 0;
    }
    // record iam_migration_audit (append per run; iam_* table only)
    for (let i = 0; i < STEP_NAMES.length; i++) {
      await client.query(
        `INSERT INTO "iam_migration_audit" ("id","step","finishedAt","rowsAffected","status","notes")
         VALUES ($1,$2, now(), $3, 'COMPLETED', $4)`,
        [`2a__${STEP_NAMES[i]}__${runId}`, `2A:${STEP_NAMES[i]}`, inserted[STEP_NAMES[i]], "Increment 2A identity/org backfill"]
      );
    }
    await client.query("COMMIT");
    console.log("\n=== APPLY (committed) ===");
    console.log("inserted this run:", JSON.stringify(inserted));
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("BACKFILL FAILED — ROLLED BACK. No retry.");
    console.error("Error:", err.message);
    client.release(); await pool.end();
    process.exit(1);
  }

  // ---- IDEMPOTENCY PROBE (transaction 2, rolled back) ----
  const probe = {};
  await client.query("BEGIN"); await client.query("SET TRANSACTION READ WRITE");
  for (let i = 0; i < statements.length; i++) {
    const res = await client.query(statements[i]);
    probe[STEP_NAMES[i]] = res.rowCount || 0;
  }
  await client.query("ROLLBACK");
  const probeZero = Object.values(probe).every((n) => n === 0);
  console.log("\n=== IDEMPOTENCY PROBE (re-run inserts in a rolled-back txn) ===");
  console.log("rows the re-run would insert:", JSON.stringify(probe), probeZero ? "→ ALL ZERO ✔" : "→ NON-ZERO ❌");

  client.release(); await pool.end();
  if (!probeZero) process.exit(1);
  console.log("\nDONE. Run verify_backfill_2a.js next (read-only).");
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
