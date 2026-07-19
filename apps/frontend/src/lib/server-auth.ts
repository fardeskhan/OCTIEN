import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cache } from "react";

export const getSession = cache(async () => {
  return await auth.api.getSession({
    headers: await headers(),
  });
});

const MEMBERSHIP_INCLUDE = {
  business: { select: { tenantId: true } },
  role: {
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  },
} as const;

/**
 * Thrown only when an authenticated user has NO business memberships at all.
 * A missing/stale business cookie is NOT fatal — we transparently fall back to the
 * user's first business so no dashboard section ever hard-crashes.
 */
export class NoBusinessAccessError extends Error {
  constructor() {
    super("NO_BUSINESS_ACCESS");
    this.name = "NoBusinessAccessError";
  }
}

export const requireBusinessContext = cache(async () => {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id;

  const cookieStore = await cookies();
  const cookieBusinessId = cookieStore.get("current_business_id")?.value;
  const cookieMembershipId = cookieStore.get("current_membership_id")?.value;

  // 1) Honour a valid business cookie when present.
  let membership =
    cookieBusinessId && cookieMembershipId
      ? await db.membership.findUnique({
          where: {
            id: cookieMembershipId,
            userId_businessId: { userId, businessId: cookieBusinessId },
          },
          include: MEMBERSHIP_INCLUDE,
        })
      : null;

  // 2) No cookie, or the cookie points at a business the user no longer has →
  //    fall back instead of throwing. Prefer a business in the user's HOME tenant
  //    (so the default matches the group dashboard), else any membership.
  if (!membership) {
    const home = await db.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
    if (home?.tenantId) {
      membership = await db.membership.findFirst({
        where: { userId, business: { tenantId: home.tenantId } },
        include: MEMBERSHIP_INCLUDE,
        orderBy: { id: "asc" },
      });
    }
    if (!membership) {
      membership = await db.membership.findFirst({
        where: { userId },
        include: MEMBERSHIP_INCLUDE,
        orderBy: { id: "asc" },
      });
    }
  }

  if (!membership) throw new NoBusinessAccessError();

  const currentBusinessId = membership.businessId;

  // Flatten permissions for easy checking
  const permissions = membership.role.permissions.map(
    (rp) => `${rp.permission.resource}.${rp.permission.action}`
  );

  // Derived scope fields consumed across server actions.
  const tenantId = membership.business.tenantId;

  return { session, currentBusinessId, tenantId, userId, membership, permissions };
});

/**
 * Resolve the active business id (cookie, else the user's first business). Never throws for a
 * user who has at least one membership — the safe replacement for ad-hoc cookie reads that used
 * to throw "No business context selected".
 */
export async function getActiveBusinessId(): Promise<string> {
  const { currentBusinessId } = await requireBusinessContext();
  return currentBusinessId;
}

/**
 * Super-admin roles bypass all permission/role guards. Owner is the tenant super-admin and is
 * intentionally granted every capability (also backed by rolePermissions in the DB); SUPER_ADMIN is
 * the platform super-admin. This is the ONLY authorization bypass — a legitimate, explicit one.
 */
function isSuperAdmin(role: { name: string; isSystem: boolean }): boolean {
  // Case-insensitive: tenants may store the super-admin role as "Owner", "OWNER", or "SUPER_ADMIN".
  const name = role.name.toLowerCase();
  return name === "owner" || name === "super_admin";
}

export async function requirePermission(permissionString: string) {
  const { membership, permissions } = await requireBusinessContext();

  if (isSuperAdmin(membership.role)) {
    return true; // Owner / Super Admin have all permissions
  }

  if (!permissions.includes(permissionString)) {
    throw new Error(`Forbidden: Requires permission ${permissionString}`);
  }

  return true;
}

export async function requireRole(roleName: string) {
  const { membership } = await requireBusinessContext();

  if (isSuperAdmin(membership.role)) {
    return true;
  }

  if (membership.role.name !== roleName) {
    throw new Error(`Forbidden: Requires role ${roleName}`);
  }

  return true;
}

export async function requireAnyRole(roleNames: string[]) {
  const { membership } = await requireBusinessContext();

  if (isSuperAdmin(membership.role)) {
    return true;
  }

  if (!roleNames.includes(membership.role.name)) {
    throw new Error(`Forbidden: Requires one of roles ${roleNames.join(', ')}`);
  }

  return true;
}
