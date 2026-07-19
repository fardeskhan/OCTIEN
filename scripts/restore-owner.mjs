/**
 * Idempotent owner-account recovery for COSMY ERP.
 *
 * Ensures owner@cosmy.ai exists in the COSMY Group tenant with an Owner role holding every
 * permission, a membership to a default active business, and a known password.
 *
 * NOTE ON HASHING: Better Auth uses **scrypt** (via `better-auth/crypto`), NOT bcrypt. The password
 * hash MUST be produced with Better Auth's own `hashPassword`, or the app cannot verify it.
 *
 * Run:  DATABASE_URL="file:D:/cosmyerp/COSMY-BOS/packages/database/prisma/dev.db" node scripts/restore-owner.mjs
 * Optional: OWNER_PASSWORD env overrides the default "Owner@123".
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const db = new PrismaClient();
const EMAIL = "owner@cosmy.ai";
const PASSWORD = process.env.OWNER_PASSWORD || "Owner@123";

// 1) Tenant (COSMY Group) — reuse if present.
let tenant = await db.tenant.findFirst({ where: { slug: "cosmy-group" } });
if (!tenant) tenant = await db.tenant.create({ data: { name: "COSMY Group", slug: "cosmy-group" } });

// 2) User — find by email (unique), else create. Never duplicate.
let user = await db.user.findFirst({ where: { email: EMAIL } });
if (!user) {
  user = await db.user.create({ data: { email: EMAIL, name: "COSMY Owner", tenantId: tenant.id, emailVerified: true } });
  console.log("created user", EMAIL);
} else {
  await db.user.update({ where: { id: user.id }, data: { tenantId: tenant.id, emailVerified: true } });
}

// 3) Owner role with ALL permissions.
let ownerRole = await db.role.findFirst({ where: { tenantId: tenant.id, name: "Owner" } });
if (!ownerRole) ownerRole = await db.role.create({ data: { tenantId: tenant.id, name: "Owner", description: "Full access", isSystem: true } });
for (const p of await db.permission.findMany()) {
  await db.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: p.id } },
    update: {},
    create: { roleId: ownerRole.id, permissionId: p.id },
  });
}

// 4) Default business + membership. Prefer an existing active COSMY Group business (e.g. Salam Cola).
let business = await db.business.findFirst({ where: { tenantId: tenant.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
if (!business) {
  const currency = await db.currency.findFirst();
  const businessType = (await db.businessType.findFirst()) ?? (await db.businessType.create({ data: { name: "General" } }));
  business = await db.business.create({
    data: { tenantId: tenant.id, businessTypeId: businessType.id, name: "COSMY Default", slug: `cosmy-default-${Date.now()}`, status: "ACTIVE", defaultCurrencyId: currency?.id ?? null, fiscalYearStartMonth: 4 },
  });
  console.log("created default business", business.name);
}
await db.membership.upsert({
  where: { userId_businessId: { userId: user.id, businessId: business.id } },
  update: { roleId: ownerRole.id },
  create: { userId: user.id, businessId: business.id, roleId: ownerRole.id },
});

// Tenant-isolation hygiene: repoint EVERY membership of this user to the correct home-tenant Owner
// role (the migration left one pointing at a foreign-tenant "OWNER" role with 0 permissions).
const repointed = await db.membership.updateMany({ where: { userId: user.id }, data: { roleId: ownerRole.id } });
console.log(`repointed ${repointed.count} membership(s) to the home Owner role`);

// 5) Set the password (Better Auth scrypt hash) on the credential account. Idempotent.
const passwordHash = await hashPassword(PASSWORD);
const credential = await db.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
if (credential) {
  await db.account.update({ where: { id: credential.id }, data: { password: passwordHash } });
} else {
  await db.account.create({ data: { accountId: user.id, providerId: "credential", userId: user.id, password: passwordHash } });
  console.log("created credential account");
}

console.log(`DONE — ${EMAIL} ready. Password: ${PASSWORD}. Default business: ${business.name}. Role: Owner (all permissions).`);
await db.$disconnect();
