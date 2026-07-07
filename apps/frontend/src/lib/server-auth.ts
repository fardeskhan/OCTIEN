import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cache } from "react";

export const getSession = cache(async () => {
  return await auth.api.getSession({
    headers: await headers(),
  });
});

export const requireBusinessContext = cache(async () => {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const cookieStore = await cookies();
  const currentBusinessId = cookieStore.get("current_business_id")?.value;
  const currentMembershipId = cookieStore.get("current_membership_id")?.value;

  if (!currentBusinessId || !currentMembershipId) {
    throw new Error("No active business selected");
  }

  // Validate the user actually belongs to this business and membership
  const membership = await db.membership.findUnique({
    where: {
      id: currentMembershipId,
      userId_businessId: {
        userId: session.user.id,
        businessId: currentBusinessId,
      },
    },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  });

  if (!membership) {
    throw new Error("You do not have access to this business");
  }

  // Flatten permissions for easy checking
  const permissions = membership.role.permissions.map(
    (rp) => `${rp.permission.resource}.${rp.permission.action}`
  );

  return { session, currentBusinessId, membership, permissions };
});

export async function requirePermission(permissionString: string) {
  const { membership, permissions } = await requireBusinessContext();
  
  if (membership.role.isSystem && membership.role.name === "SUPER_ADMIN") {
    return true; // Super Admin overrides
  }

  if (!permissions.includes(permissionString)) {
    throw new Error(`Forbidden: Requires permission ${permissionString}`);
  }

  return true;
}

export async function requireRole(roleName: string) {
  const { membership } = await requireBusinessContext();
  
  if (membership.role.isSystem && membership.role.name === "SUPER_ADMIN") {
    return true;
  }

  if (membership.role.name !== roleName && membership.role.name !== "Owner") {
    throw new Error(`Forbidden: Requires role ${roleName}`);
  }

  return true;
}

export async function requireAnyRole(roleNames: string[]) {
  const { membership } = await requireBusinessContext();
  
  if (membership.role.isSystem && membership.role.name === "SUPER_ADMIN") {
    return true;
  }

  if (!roleNames.includes(membership.role.name) && membership.role.name !== "Owner") {
    throw new Error(`Forbidden: Requires one of roles ${roleNames.join(', ')}`);
  }

  return true;
}
