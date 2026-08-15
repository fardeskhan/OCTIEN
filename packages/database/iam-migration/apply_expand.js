/**
 * OCTIEN IAM — EXPAND APPLY (transactional; psql unavailable).
 * Applies ONLY packages/database/iam-migration/001_expand.sql to the live Neon DB
 * inside ONE PostgreSQL transaction. Additive-only DDL (reviewed).
 *
 * SAFETY GUARDS:
 *   - Requires an explicit `--confirm` flag; without it, nothing runs.
 *   - ABORTS (before any write) if ANY iam_* table already exists.
 *   - Wraps the whole file in BEGIN; SET TRANSACTION READ WRITE; ... COMMIT.
 *   - On ANY statement error: ROLLBACK, print the exact failing statement, exit 1.
 *     No automatic retry. No automatic repair.
 *   - Does NOT run prisma db push / migrate deploy. Does NOT run the backfill.
 *   - Does NOT touch reporting_executive_dashboard or any legacy table.
 *
 * Usage:  NODE_PATH=<repo>/node_modules node packages/database/iam-migration/apply_expand.js --confirm
 */
const fs = require("fs");
const path = require("path");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

const REPO = "D:/1/cosmyerp/COSMY-BOS";
const SQL_PATH = path.join(REPO, "packages/database/iam-migration/001_expand.sql");

function readDatabaseUrl() {
  const env = fs.readFileSync(path.join(REPO, ".env"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  let v = line.slice("DATABASE_URL=".length).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}

// Parse the reviewed SQL into individual statements: drop full-line comments,
// then split on ';'. 001_expand.sql has no dollar-quoted bodies or string
// literals containing ';', so this split is safe for this file.
function parseStatements(sql) {
  const noComments = sql.split(/\r?\n/).filter((l) => !l.trim().startsWith("--")).join("\n");
  return noComments.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
}

async function main() {
  // GUARD 1 — explicit confirmation
  if (!process.argv.includes("--confirm")) {
    console.error("REFUSED: apply requires the explicit --confirm flag. Nothing was executed.");
    process.exit(2);
  }

  const url = readDatabaseUrl();
  const sql = fs.readFileSync(SQL_PATH, "utf8");
  const statements = parseStatements(sql);

  // GUARD 2 — no destructive statement may be present in the file.
  // NOTE: must NOT match "ON DELETE CASCADE/SET NULL" (FK referential actions are safe).
  // Only true destructive DDL/DML: DROP TABLE/COLUMN/TYPE/INDEX/CONSTRAINT, DELETE FROM,
  // TRUNCATE, ALTER COLUMN.
  const DESTRUCTIVE_RE =
    /\bDROP\s+(TABLE|COLUMN|TYPE|INDEX|CONSTRAINT|SCHEMA|DATABASE)\b|\bTRUNCATE\b|\bDELETE\s+FROM\b|\bALTER\s+COLUMN\b/i;
  const destructive = statements.filter((s) => DESTRUCTIVE_RE.test(s));
  if (destructive.length) {
    console.error(`REFUSED: file contains ${destructive.length} destructive statement(s); expected additive-only. Nothing executed.`);
    console.error(destructive[0].slice(0, 120));
    process.exit(2);
  }

  console.log(`File:       ${SQL_PATH}`);
  console.log(`Statements: ${statements.length} (additive-only)`);

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  // GUARD 3 — abort if any iam_* table already exists (idempotency / clean-baseline)
  const pre = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'iam\\_%'"
  );
  if (pre.rows.length > 0) {
    console.error(`REFUSED: ${pre.rows.length} iam_* table(s) already exist — not a clean baseline. Nothing executed.`);
    console.error(pre.rows.map((r) => r.table_name).join(", "));
    client.release(); await pool.end();
    process.exit(2);
  }

  // APPLY — one transaction, read-write, atomic.
  let executed = 0;
  try {
    await client.query("BEGIN");
    await client.query("SET TRANSACTION READ WRITE");
    for (const stmt of statements) {
      await client.query(stmt);
      executed++;
    }
    await client.query("COMMIT");
    console.log(`COMMIT OK — ${executed}/${statements.length} statements applied atomically.`);
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("APPLY FAILED — transaction ROLLED BACK. No retry, no repair.");
    console.error(`Failed at statement #${executed + 1}/${statements.length}:`);
    console.error(statements[executed] ? statements[executed].slice(0, 300) : "(unknown)");
    console.error("Error:", err.message);
    client.release(); await pool.end();
    process.exit(1);
  }

  client.release();
  await pool.end();
  console.log("DONE. Run verify_post_apply.js next (read-only).");
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
