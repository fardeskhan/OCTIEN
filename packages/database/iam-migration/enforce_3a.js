/**
 * OCTIEN IAM — Increment 3A enforcement fixture tests (no DB, no production data).
 * Verifies (a) the pure reconcile truth table, and (b) restricted-employee behavior through the real
 * engine + reconciliation: Finance/etc. stay DENIed under the canary, and the safe-canary never locks
 * a user out (on a legacy/OCTIEN divergence the legacy decision wins, flagged as a mismatch).
 *
 * Usage: ENGINE_JS=<compiled permission-engine.js> CORE_JS=<compiled enforcement-core.js> node enforce_3a.js
 */
const { decide } = require(process.env.ENGINE_JS);
const { reconcile } = require(process.env.CORE_JS);

const results = [];
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  results.push({ label, got, want, ok });
};

// ---- A. reconcile truth table (safe canary: final always = legacy) ----
check("reconcile(ALLOW, ALLOW) → agree", reconcile("ALLOW", "ALLOW"), { final: "ALLOW", fallbackReason: null });
check("reconcile(DENY, DENY) → agree", reconcile("DENY", "DENY"), { final: "DENY", fallbackReason: null });
check("reconcile(ALLOW, DENY) → legacy (mismatch)", reconcile("ALLOW", "DENY"), { final: "ALLOW", fallbackReason: "mismatch" });
check("reconcile(DENY, ALLOW) → legacy (mismatch)", reconcile("DENY", "ALLOW"), { final: "DENY", fallbackReason: "mismatch" });
check("reconcile(ALLOW, null) → legacy (octien-error)", reconcile("ALLOW", null), { final: "ALLOW", fallbackReason: "octien-error" });
check("reconcile(DENY, null) → legacy (octien-error)", reconcile("DENY", null), { final: "DENY", fallbackReason: "octien-error" });

// ---- B. Restricted Marketing employee through engine + reconcile ----
const ROLE = "role_marketing", SALAM = "salam", UCO = "uco";
const snap = {
  principals: new Set(["emp1"]),
  entities: new Set([SALAM, UCO]),
  grantsByPrincipal: new Map([["emp1", [{ id: "g", principalId: "emp1", roleId: ROLE, scopeId: "s", effect: "ALLOW", state: "ACTIVE", startAt: null, endAt: null }]]]),
  scopeDimsByScope: new Map([["s", [{ dimension: "ENTITY", nodeId: SALAM, valueKey: null, mode: "EXACT" }]]]),
  rolePermissions: new Map([[ROLE, new Set(["customer|read", "lead|create", "campaign|read"])]]),
  registryActions: new Set(["customer|read", "lead|create", "campaign|read", "invoice|read", "inventory|adjust", "employee|manage", "payroll|read"]),
  ownerRoleIds: new Set(),
  now: Date.now(),
};
const octien = (e, r, a) => decide(snap, "emp1", e, r, a).decision;

// Correct legacy (a real restricted employee) agrees with OCTIEN → final matches, restriction enforced.
const cases = [
  ["customer.read @ Salam", octien(SALAM, "customer", "read"), "ALLOW"],
  ["lead.create @ Salam", octien(SALAM, "lead", "create"), "ALLOW"],
  ["invoice.read (Finance) @ Salam", octien(SALAM, "invoice", "read"), "DENY"],
  ["inventory.adjust @ Salam", octien(SALAM, "inventory", "adjust"), "DENY"],
  ["employee.manage (HR) @ Salam", octien(SALAM, "employee", "manage"), "DENY"],
  ["payroll.read @ Salam", octien(SALAM, "payroll", "read"), "DENY"],
  ["customer.read @ UCO (other entity)", octien(UCO, "customer", "read"), "DENY"],
];
for (const [label, oct, expected] of cases) {
  // engine decision correct?
  check(`engine: ${label} = ${expected}`, oct, expected);
  // under the safe canary with a correct legacy that agrees, the final enforced decision matches
  const legacy = expected;
  check(`canary final: ${label} = ${expected}`, reconcile(legacy, oct).final, expected);
}

// Lockout-safety: if legacy erroneously ALLOWED a Finance action that OCTIEN denies, the safe canary
// must NOT lock out — final = legacy (ALLOW), with the divergence flagged as a mismatch.
const financeOct = octien(SALAM, "invoice", "read"); // DENY
check("safe-canary no-lockout: legacy=ALLOW, octien=DENY → final ALLOW", reconcile("ALLOW", financeOct).final, "ALLOW");
check("safe-canary flags divergence: legacy=ALLOW, octien=DENY → mismatch", reconcile("ALLOW", financeOct).fallbackReason, "mismatch");

// ---- report ----
const fails = results.filter((r) => !r.ok);
console.log(fails.length === 0 ? "ENFORCE 3A FIXTURE: PASS ✔" : "ENFORCE 3A FIXTURE: FAIL ❌");
console.log(`checks: ${results.length - fails.length}/${results.length}`);
for (const r of results) if (!r.ok) console.log(`  FAIL: ${r.label} got=${JSON.stringify(r.got)} want=${JSON.stringify(r.want)}`);
process.exit(fails.length === 0 ? 0 : 1);
