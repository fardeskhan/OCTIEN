/**
 * OCTIEN Permission Engine — pure decision core (SHADOW ONLY; NOT wired to enforcement).
 *
 * Implements `decide()` (point decision) and `scopeFilter()` (set decision) per
 * docs/platform/OCTIEN_PERMISSION_ENGINE.md: identity gate → structural gate → registry gate
 * → gather grants → scope match → role-permission → deny-overrides-allow → default-deny.
 *
 * IMPORTANT: during IAM Increment 2D this module is imported by NOTHING in the request path.
 * The application still authorizes via the legacy Membership/Role path; this engine runs only
 * inside the shadow-comparison harness to prove it reproduces today's decisions. It has no
 * side effects and performs no I/O — callers supply an in-memory {@link AuthzSnapshot}.
 *
 * The pipeline is written general-purpose (Location/Department/… dimensions, DENY grants, time
 * bounds) even though the 2A/2B backfill only populates single ENTITY-EXACT ALLOW grants; the
 * extra dimensions stay inert until real scopes are configured in a later, separately-approved
 * increment.
 */

export type Effect = "ALLOW" | "DENY";
export type ScopeDimensionKind =
  | "ORGANIZATION" | "WORKSPACE" | "ENTITY" | "LOCATION" | "DEPARTMENT"
  | "TEAM" | "PROJECT" | "MODULE" | "CAPABILITY" | "RESOURCE" | "RECORD" | "FIELD";
export type ScopeMode = "EXACT" | "SUBTREE" | "EXCLUDE";

export interface ScopeDimension {
  dimension: ScopeDimensionKind;
  nodeId: string | null;
  valueKey: string | null;
  mode: ScopeMode;
}

export interface Grant {
  id: string;
  principalId: string;
  roleId: string;
  scopeId: string;
  effect: Effect;
  state: "ACTIVE" | "SUSPENDED";
  startAt: string | null;
  endAt: string | null;
}

/**
 * An in-memory snapshot of the OCTIEN authorization graph. The caller (a DB reader or a test
 * harness) builds this; the engine never performs I/O.
 */
export interface AuthzSnapshot {
  /** Valid principal ids (identity gate). */
  principals: Set<string>;
  /** Valid entity ids (structural gate for entity-level targets). */
  entities: Set<string>;
  /** principalId → that principal's grants. */
  grantsByPrincipal: Map<string, Grant[]>;
  /** scopeId → its dimensions. */
  scopeDimsByScope: Map<string, ScopeDimension[]>;
  /** roleId → set of authorized permission keys, each `resource|action`. */
  rolePermissions: Map<string, Set<string>>;
  /** Registered `resource|action` keys (registry gate). */
  registryActions: Set<string>;
  /**
   * Role ids that carry unconditional **owner / super-admin** authority. A grant whose role is in
   * this set authorizes ANY *registered* `resource.action` within the grant's scope, independent of
   * role→permission rows — so a new module introducing `new.resource.action` never silently drops
   * Owner access, and Owner authority is NOT a frozen copy of the permissions present at migration.
   * Optional; absent ⇒ no owner fast-path (falls back to role→permission rows). The registry gate
   * still applies: owners cannot act on unregistered keys.
   */
  ownerRoleIds?: Set<string>;
  /** Optional clock for time-bound grants (defaults to Date.now()). */
  now?: number;
}

export interface DecisionResult {
  decision: Effect;
  reason: string;
}

const EMPTY_ROLE_SET: ReadonlySet<string> = new Set<string>();

/** Does a scope apply to this target entity? All constrained dimensions must be satisfied. */
function scopeMatchesEntity(snapshot: AuthzSnapshot, scopeId: string, entityId: string): boolean {
  const dims = snapshot.scopeDimsByScope.get(scopeId) ?? [];
  for (const d of dims) {
    if (d.dimension === "ENTITY") {
      if (d.mode === "EXCLUDE") {
        if (d.nodeId === entityId) return false;
      } else {
        // EXACT and (for entity-level targets) SUBTREE both require the node to be this entity.
        if (d.nodeId !== entityId) return false;
      }
    }
    // Non-entity dimensions (LOCATION/DEPARTMENT/TEAM/PROJECT/RECORD/FIELD) constrain record-level
    // targets, not this entity-level point decision. They are inert in 2D (none are populated yet);
    // when real scopes exist they will be evaluated against the target record's hierarchy stamp.
  }
  return true;
}

/** Point decision: may `principalId` perform `resource.action` on `entityId`? */
export function decide(
  snapshot: AuthzSnapshot,
  principalId: string,
  entityId: string,
  resource: string,
  action: string,
): DecisionResult {
  // 0. Identity gate
  if (!snapshot.principals.has(principalId)) return { decision: "DENY", reason: "unknown-principal" };
  // 1. Structural gate
  if (!snapshot.entities.has(entityId)) return { decision: "DENY", reason: "unknown-entity" };
  // 2. Registry gate — the resource.action must be a registered, authorizable permission
  const permKey = `${resource}|${action}`;
  if (!snapshot.registryActions.has(permKey)) return { decision: "DENY", reason: "unregistered-resource-action" };

  const grants = snapshot.grantsByPrincipal.get(principalId) ?? [];
  const ownerRoles = snapshot.ownerRoleIds ?? EMPTY_ROLE_SET;
  const now = snapshot.now ?? Date.now();
  let anyAllow = false;
  let viaOwner = false;

  for (const g of grants) {
    if (g.state !== "ACTIVE") continue;
    if (g.startAt && Date.parse(g.startAt) > now) continue; // not yet valid
    if (g.endAt && Date.parse(g.endAt) < now) continue; // expired
    if (!scopeMatchesEntity(snapshot, g.scopeId, entityId)) continue;
    // Owner/Super-Admin authority: an owner-role grant authorizes ANY registered resource.action
    // within its scope, independent of role→permission rows. (Registry gate above still applies.)
    const isOwnerGrant = ownerRoles.has(g.roleId);
    const roleHasPerm = isOwnerGrant || (snapshot.rolePermissions.get(g.roleId)?.has(permKey) ?? false);
    if (!roleHasPerm) continue;
    // 3. Resolve — deny overrides allow
    if (g.effect === "DENY") return { decision: "DENY", reason: "explicit-deny (deny-overrides-allow)" };
    anyAllow = true;
    if (isOwnerGrant) viaOwner = true;
  }

  // 4. Default deny
  return anyAllow
    ? { decision: "ALLOW", reason: viaOwner ? "org-owner authority" : "grant+scope+role-permission" }
    : { decision: "DENY", reason: "no-matching-allow (default-deny)" };
}

/** Set decision: the entity ids on which `principalId` may perform `resource.action`. */
export function scopeFilter(
  snapshot: AuthzSnapshot,
  principalId: string,
  resource: string,
  action: string,
): string[] {
  const allowed: string[] = [];
  for (const entityId of snapshot.entities) {
    if (decide(snapshot, principalId, entityId, resource, action).decision === "ALLOW") allowed.push(entityId);
  }
  return allowed.sort();
}
