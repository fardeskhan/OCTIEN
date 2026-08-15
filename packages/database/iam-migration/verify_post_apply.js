/**
 * OCTIEN IAM — POST-APPLY VERIFICATION (READ ONLY)
 * Run ONLY after 001_expand.sql has been applied. Strictly read-only:
 * BEGIN; SET TRANSACTION READ ONLY; ... ROLLBACK. No writes.
 *
 * Confirms: all 22 iam_* tables exist, all 9 IAM enums exist, IAM indexes exist,
 * every FK on iam_* tables references an iam_* table only, legacy tables still
 * exist, and legacy CONFIG row counts are identical to PRE_APPLY_BASELINE.md.
 * Writes POST_APPLY_BASELINE.md and exits non-zero on ANY mismatch.
 *
 * Usage:  NODE_PATH=<repo>/node_modules node packages/database/iam-migration/verify_post_apply.js
 */
const fs = require("fs");
const path = require("path");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

const REPO = "D:/1/cosmyerp/COSMY-BOS";
const OUT = path.join(REPO, "packages/database/iam-migration/POST_APPLY_BASELINE.md");

const EXPECTED_IAM_TABLES = [
  "iam_principals", "iam_organizations", "iam_workspaces", "iam_entity_templates",
  "iam_entities", "iam_locations", "iam_departments", "iam_teams", "iam_projects",
  "iam_project_links", "iam_permission_groups", "iam_group_permissions", "iam_role_groups",
  "iam_grants", "iam_scopes", "iam_scope_dimensions", "iam_policies", "iam_modules",
  "iam_resource_definitions", "iam_action_definitions", "iam_audit_events", "iam_migration_audit",
];
const EXPECTED_ENUMS = [
  "PrincipalKind", "PrincipalState", "WorkspaceKind", "NodeState", "Effect",
  "GrantState", "ScopeDim", "ScopeMode", "IamAuditAction",
];
// Immutable baseline from PRE_APPLY_BASELINE.md. Config tables MUST be identical
// (DDL cannot change rows). Volatile tables may differ ONLY from live usage.
const BASELINE = {
  config: { users: 2, roles: 2, permissions: 29, role_permissions: 29, memberships: 4,
            tenants: 2, businesses: 3, business_types: 1, accounts: 2, verifications: 0 },
  volatile: { sessions: 40, audit_logs: 22, audit_events: 79 },
};

function readDatabaseUrl() {
  const env = fs.readFileSync(path.join(REPO, ".env"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  let v = line.slice("DATABASE_URL=".length).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}

async function main() {
  const url = readDatabaseUrl();
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  const problems = [];
  const lines = [];
  const log = (s = "") => lines.push(s);

  await client.query("BEGIN");
  await client.query("SET TRANSACTION READ ONLY");

  const tables = (await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
  )).rows.map((r) => r.table_name);

  // 1. iam_* tables present
  const missingIam = EXPECTED_IAM_TABLES.filter((t) => !tables.includes(t));
  if (missingIam.length) problems.push(`Missing iam_* tables: ${missingIam.join(", ")}`);

  // 2. enums present
  const enums = (await client.query(
    "SELECT typname FROM pg_type WHERE typtype='e'"
  )).rows.map((r) => r.typname);
  const missingEnums = EXPECTED_ENUMS.filter((e) => !enums.includes(e));
  if (missingEnums.length) problems.push(`Missing IAM enums: ${missingEnums.join(", ")}`);

  // 3. indexes on iam_* tables
  const iamIdx = (await client.query(
    "SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public' AND tablename LIKE 'iam\\_%' ORDER BY tablename, indexname"
  )).rows;

  // 4. every FK on an iam_* table references an iam_* table only
  const fks = (await client.query(
    `SELECT con.conname,
            src.relname  AS src_table,
            tgt.relname  AS tgt_table
     FROM pg_constraint con
     JOIN pg_class src ON src.oid = con.conrelid
     JOIN pg_class tgt ON tgt.oid = con.confrelid
     WHERE con.contype='f' AND src.relname LIKE 'iam\\_%'`
  )).rows;
  const badFks = fks.filter((f) => !f.tgt_table.startsWith("iam_"));
  if (badFks.length) problems.push(`IAM FKs referencing non-iam tables: ${badFks.map((f) => f.conname + "→" + f.tgt_table).join(", ")}`);

  // 5. legacy tables still exist + row counts
  const allBaseline = { ...BASELINE.config, ...BASELINE.volatile };
  const nowCounts = {};
  for (const t of Object.keys(allBaseline)) {
    if (!tables.includes(t)) { problems.push(`Legacy table missing: ${t}`); continue; }
    nowCounts[t] = Number((await client.query(`SELECT count(*)::int AS n FROM "${t}"`)).rows[0].n);
  }
  // config tables must match exactly
  for (const [t, exp] of Object.entries(BASELINE.config)) {
    if (nowCounts[t] !== undefined && nowCounts[t] !== exp)
      problems.push(`CONFIG row-count changed: ${t} baseline=${exp} now=${nowCounts[t]} (DDL must not change rows!)`);
  }

  await client.query("ROLLBACK");
  client.release();
  await pool.end();

  const now = new Date().toISOString();
  log("# OCTIEN IAM — Post-Apply Verification Baseline (READ ONLY)\n");
  log(`> Captured after applying \`001_expand.sql\`. Read-only; DB unmodified by this check.`);
  log(`> Generated: ${now}\n`);

  log("## iam_* tables (expected 22)\n");
  log(`Present: **${EXPECTED_IAM_TABLES.length - missingIam.length}/22**${missingIam.length ? " — MISSING: " + missingIam.join(", ") : " ✔"}\n`);
  log("## IAM enums (expected 9)\n");
  log(`Present: **${EXPECTED_ENUMS.length - missingEnums.length}/9**${missingEnums.length ? " — MISSING: " + missingEnums.join(", ") : " ✔"}\n`);
  log("## IAM indexes\n```");
  for (const r of iamIdx) log(`${r.tablename}.${r.indexname}`);
  log("```\n");
  log("## IAM foreign keys (must reference iam_* only)\n");
  log(`Total FKs on iam_* tables: ${fks.length}; referencing non-iam: **${badFks.length}** ${badFks.length ? "❌" : "✔"}\n`);
  log("## Legacy row counts vs baseline\n");
  log("| Table | Baseline | Now | Kind | OK |");
  log("|---|---|---|---|---|");
  for (const [t, exp] of Object.entries(BASELINE.config))
    log(`| \`${t}\` | ${exp} | ${nowCounts[t] ?? "MISSING"} | config | ${nowCounts[t] === exp ? "✔" : "❌"} |`);
  for (const [t, exp] of Object.entries(BASELINE.volatile))
    log(`| \`${t}\` | ${exp} | ${nowCounts[t] ?? "MISSING"} | volatile* | ${nowCounts[t] === exp ? "=" : "≠ (live usage)"} |`);
  log("\n*volatile = sessions/audit change with normal app usage, never from DDL; a difference here is not a schema problem.\n");

  log("## Result\n");
  if (problems.length === 0) {
    log("**PASS ✔** — all iam_* structures present, FKs IAM-local, legacy config tables unchanged.");
  } else {
    log("**FAIL ❌ — STOP. Do not proceed. Unexpected changes:**\n");
    for (const p of problems) log(`- ${p}`);
  }
  fs.writeFileSync(OUT, lines.join("\n"), "utf8");

  console.log(problems.length === 0 ? "POST-APPLY VERIFY: PASS ✔" : "POST-APPLY VERIFY: FAIL ❌");
  console.log("iam_* tables:", `${EXPECTED_IAM_TABLES.length - missingIam.length}/22`,
              "| enums:", `${EXPECTED_ENUMS.length - missingEnums.length}/9`,
              "| bad FKs:", badFks.length);
  console.log("config counts:", JSON.stringify(nowCounts));
  if (problems.length) { console.log("PROBLEMS:", problems.join(" | ")); process.exit(1); }
  console.log("Artifact:", OUT);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
