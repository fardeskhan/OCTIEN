const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function main() {
  console.log("\nTENANTS");
  console.log(await db.tenant.findMany({
    select: { id: true, name: true, slug: true }
  }));

  console.log("\nBUSINESSES");
  console.log(await db.business.findMany({
    take: 20,
    select: {
      id: true,
      name: true,
      tenantId: true
    }
  }));

  console.log("\nROLES");
  console.log(await db.role.findMany({
    take: 20,
    select: {
      id: true,
      name: true,
      tenantId: true,
      isSystem: true
    }
  }));
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());