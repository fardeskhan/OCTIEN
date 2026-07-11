const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function main() {
  const tenants = await db.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  console.log(tenants);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());