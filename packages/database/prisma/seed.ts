import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding COSMY ERP Database...');

  const tenantId = 'tnt_demo_001';
  const businessId = 'bus_aeterex_001';

  // 1. Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    update: {},
    create: {
      id: tenantId,
      name: 'Demo Tenant',
      slug: 'demo-tenant',
    }
  });

  // 2. Create Business Type
  const businessType = await prisma.businessType.upsert({
    where: { name: 'Holding Company' },
    update: {},
    create: {
      name: 'Holding Company',
      description: 'Default holding company type'
    }
  });

  // 3. Create Business
  const business = await prisma.business.upsert({
    where: { slug: 'aeterex-holdings' },
    update: {},
    create: {
      id: businessId,
      tenantId: tenant.id,
      businessTypeId: businessType.id,
      name: 'Aeterex Holdings',
      slug: 'aeterex-holdings',
    }
  });

  // 4. Create Roles
  const roles = ["Owner", "Finance", "Operations", "Warehouse", "Sales", "Driver", "Auditor"];
  const createdRoles: Record<string, string> = {};

  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: roleName } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: roleName,
        description: `${roleName} Role`,
      }
    });
    createdRoles[roleName] = role.id;
  }

  // 5. Create Test Users and Memberships
  for (const roleName of roles) {
    const email = `${roleName.toLowerCase()}@cosmy.ai`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        tenantId: tenant.id,
        name: `Test ${roleName}`,
        email,
        emailVerified: true,
      }
    });

    await prisma.membership.upsert({
      where: { userId_businessId: { userId: user.id, businessId: business.id } },
      update: { roleId: createdRoles[roleName] },
      create: {
        userId: user.id,
        businessId: business.id,
        roleId: createdRoles[roleName]
      }
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
