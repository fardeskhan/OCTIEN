/**
 * Idempotent permission-catalog seeder.
 *
 * Creates the canonical RBAC permission catalog and grants every "Owner" role all of them.
 * Standalone and non-destructive — touches ONLY the Permission and RolePermission tables, so it is
 * safe to run against a live database (Neon) without disturbing tenants, users, or business data.
 *
 * Run: node scripts/seed-permissions.mjs   (DATABASE_URL loaded from .env)
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// The canonical catalog — resource.action pairs enforced across the app via requirePermission().
const PERMISSIONS = [
  ["finance", "read"], ["finance", "write"], ["finance", "approve"],
  ["sales", "read"], ["sales", "write"],
  ["procurement", "read"],
  ["inventory", "read"], ["inventory", "update"],
  ["product", "create"], ["product", "update"],
  ["supplier", "create"], ["supplier", "update"],
  ["warehouse", "create"],
  ["purchase_order", "create"], ["purchase_order", "update"], ["purchase_order", "approve"],
  ["purchase_requisition", "create"], ["purchase_requisition", "update"], ["purchase_requisition", "approve"],
  ["fulfillment", "create"], ["fulfillment", "update"],
  ["logistics", "read"], ["logistics", "write"],
  ["reference", "create"],
  ["reporting", "read"],
  ["governance", "read"],
  ["uco", "read"], ["salam", "read"], ["lumas", "read"],
];

// 1) Upsert the catalog (unique on resource+action).
const permIds = [];
for (const [resource, action] of PERMISSIONS) {
  const p = await db.permission.upsert({
    where: { resource_action: { resource, action } },
    update: {},
    create: { resource, action, description: `${action} ${resource}` },
  });
  permIds.push(p.id);
}
console.log(`permissions ensured: ${permIds.length}`);

// 2) Grant EVERY Owner role all permissions (idempotent).
const ownerRoles = await db.role.findMany({ where: { name: "Owner" } });
let grants = 0;
for (const role of ownerRoles) {
  for (const permissionId of permIds) {
    await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId } },
      update: {},
      create: { roleId: role.id, permissionId },
    });
    grants++;
  }
}
console.log(`Owner roles granted (${ownerRoles.length} role(s) × ${permIds.length} perms = ${grants} grants)`);

const totalPerms = await db.permission.count();
const totalGrants = await db.rolePermission.count();
console.log(`DONE — permissions: ${totalPerms}, rolePermissions: ${totalGrants}`);
await db.$disconnect();
