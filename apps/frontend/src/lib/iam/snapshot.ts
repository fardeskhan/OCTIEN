/**
 * OCTIEN IAM — authorization snapshot loader (shared by shadow 2E/2F and enforcement 3A).
 *
 * Optimized per 3A-P measurement (the ~2–3.3s was 8 serialized query round-trips, NOT connection
 * setup or query cost — warm ≈ cold). Two independent levers, both applied here:
 *   1. NEAR-STATIC cache — module registry, resources/actions, roles, role→permissions, and the
 *      principal/entity id sets change rarely; they are loaded once and cached in-process with a
 *      short TTL (invalidate on IAM writes via `invalidateNearStatic`). Removes ~6 queries/request.
 *   2. REQUEST-SPECIFIC combined query — a principal's grants + their scope dimensions load in ONE
 *      round-trip (grants LEFT JOIN scope_dimensions) instead of two.
 * Net: 8 queries/request → 1 (warm cache). The per-request React `cache()` wrapper is preserved so
 * all `requirePermission()` calls in a request share a single build.
 *
 * Read-only; no writes. TEMPORARY migration infrastructure (removed with the shadow/enforcement
 * instruments after cutover). Single-org pilot: the near-static cache is process-global; for
 * multi-org it must be keyed by organization id (noted for 3D+).
 */
import { cache } from "react";
import { db } from "@/lib/db";
import {
  type AuthzSnapshot,
  type Grant,
  type ScopeDimension,
  type ScopeDimensionKind,
  type ScopeMode,
  type Effect,
} from "./permission-engine";

export interface Pair { resource: string; action: string; }

/** Owner/Super-Admin role detection — mirrors legacy `isSuperAdmin` (server-auth.ts). */
export function isOwnerRoleName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === "owner" || n === "super_admin";
}

/** Resolve a legacy `resource.action` string to its {resource, action}. */
export function resolvePair(dotted: Map<string, Pair>, permissionString: string): Pair {
  const hit = dotted.get(permissionString);
  if (hit) return hit;
  const i = permissionString.indexOf(".");
  return i === -1
    ? { resource: permissionString, action: "" }
    : { resource: permissionString.slice(0, i), action: permissionString.slice(i + 1) };
}

// ---------------------------------------------------------------------------
// Near-static authorization data (org-wide; safe to cache with a short TTL).
// ---------------------------------------------------------------------------
interface NearStatic {
  principals: Set<string>;
  entities: Set<string>;
  rolePermissions: Map<string, Set<string>>;
  ownerRoleIds: Set<string>;
  registryActions: Set<string>;
  dotted: Map<string, Pair>;
}

let nearStaticCache: { data: NearStatic; expiresAt: number } | null = null;
const NEAR_STATIC_TTL_MS = (() => {
  const v = Number(process.env.IAM_SNAPSHOT_TTL_MS ?? "60000");
  return Number.isFinite(v) && v >= 0 ? v : 60000;
})();

/** Drop the near-static cache (call after any IAM write: role/permission/registry/principal/entity). */
export function invalidateNearStatic(): void {
  nearStaticCache = null;
}

async function loadNearStatic(): Promise<NearStatic> {
  if (nearStaticCache && nearStaticCache.expiresAt > Date.now()) return nearStaticCache.data;

  const [principals, entities, permissions, registry, rolePerms, roles] = await Promise.all([
    db.principal.findMany({ select: { id: true } }),
    db.entity.findMany({ select: { id: true } }),
    db.permission.findMany({ select: { resource: true, action: true } }),
    db.actionDefinition.findMany({ include: { resourceDef: { select: { key: true } } } }),
    db.rolePermission.findMany({ include: { permission: { select: { resource: true, action: true } } } }),
    db.role.findMany({ select: { id: true, name: true } }),
  ]);

  const rolePermissions = new Map<string, Set<string>>();
  for (const rp of rolePerms) {
    const set = rolePermissions.get(rp.roleId) ?? new Set<string>();
    set.add(`${rp.permission.resource}|${rp.permission.action}`);
    rolePermissions.set(rp.roleId, set);
  }
  const ownerRoleIds = new Set(roles.filter((r) => isOwnerRoleName(r.name)).map((r) => r.id));
  const registryActions = new Set<string>();
  for (const a of registry) registryActions.add(`${a.resourceDef.key}|${a.key}`);
  const dotted = new Map<string, Pair>();
  for (const p of permissions) dotted.set(`${p.resource}.${p.action}`, { resource: p.resource, action: p.action });

  const data: NearStatic = {
    principals: new Set(principals.map((p) => p.id)),
    entities: new Set(entities.map((e) => e.id)),
    rolePermissions, ownerRoleIds, registryActions, dotted,
  };
  nearStaticCache = { data, expiresAt: Date.now() + NEAR_STATIC_TTL_MS };
  return data;
}

// ---------------------------------------------------------------------------
// Request-specific data — a principal's grants + their scope dimensions in ONE query.
// ---------------------------------------------------------------------------
interface GrantDimRow {
  gid: string; principalId: string; roleId: string; scopeId: string; effect: string; state: string;
  startAt: Date | null; endAt: Date | null;
  dimension: string | null; nodeId: string | null; valueKey: string | null; mode: string | null;
}

async function loadRequestSpecific(userId: string): Promise<{
  grantsByPrincipal: Map<string, Grant[]>;
  scopeDimsByScope: Map<string, ScopeDimension[]>;
}> {
  const rows = await db.$queryRaw<GrantDimRow[]>`
    SELECT g."id" AS gid, g."principalId", g."roleId", g."scopeId", g."effect", g."state", g."startAt", g."endAt",
           sd."dimension", sd."nodeId", sd."valueKey", sd."mode"
    FROM "iam_grants" g
    LEFT JOIN "iam_scope_dimensions" sd ON sd."scopeId" = g."scopeId"
    WHERE g."principalId" = ${userId}`;

  const grantsById = new Map<string, Grant>();
  const scopeDimsByScope = new Map<string, ScopeDimension[]>();
  const seenDim = new Set<string>();
  for (const r of rows) {
    if (!grantsById.has(r.gid)) {
      grantsById.set(r.gid, {
        id: r.gid, principalId: r.principalId, roleId: r.roleId, scopeId: r.scopeId,
        effect: r.effect as Effect, state: r.state as "ACTIVE" | "SUSPENDED",
        startAt: r.startAt ? new Date(r.startAt).toISOString() : null,
        endAt: r.endAt ? new Date(r.endAt).toISOString() : null,
      });
    }
    if (r.dimension) {
      const dimKey = `${r.scopeId}|${r.dimension}|${r.nodeId}|${r.mode}`;
      if (!seenDim.has(dimKey)) {
        seenDim.add(dimKey);
        const list = scopeDimsByScope.get(r.scopeId) ?? [];
        list.push({ dimension: r.dimension as ScopeDimensionKind, nodeId: r.nodeId, valueKey: r.valueKey, mode: r.mode as ScopeMode });
        scopeDimsByScope.set(r.scopeId, list);
      }
    }
  }
  const grantsByPrincipal = new Map<string, Grant[]>();
  grantsByPrincipal.set(userId, [...grantsById.values()]);
  return { grantsByPrincipal, scopeDimsByScope };
}

/**
 * Build a snapshot WITHOUT the per-request `cache()` memoization. For internal use and the 3A-P2
 * performance measurement endpoint (which must exercise cold/warm/concurrent builds deliberately).
 * Production code should use {@link loadAuthSnapshot}.
 */
export async function buildAuthSnapshotUncached(userId: string): Promise<{ snapshot: AuthzSnapshot; dotted: Map<string, Pair> }> {
  const [ns, rs] = await Promise.all([loadNearStatic(), loadRequestSpecific(userId)]);
  const snapshot: AuthzSnapshot = {
    principals: ns.principals,
    entities: ns.entities,
    grantsByPrincipal: rs.grantsByPrincipal,
    scopeDimsByScope: rs.scopeDimsByScope,
    rolePermissions: ns.rolePermissions,
    registryActions: ns.registryActions,
    ownerRoleIds: ns.ownerRoleIds,
    now: Date.now(),
  };
  return { snapshot, dotted: ns.dotted };
}

/**
 * Load-once-per-request authorization snapshot. React `cache()` memoizes per request, so shadow and
 * enforcement share a single build (cache hit ⇒ ~0ms). Near-static data is additionally cached across
 * requests (TTL); only the request-specific grants/scopes are fetched per request (one query).
 */
export const loadAuthSnapshot = cache(buildAuthSnapshotUncached);
