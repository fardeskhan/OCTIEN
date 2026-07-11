const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      tenantId: true,
    },
    take: 20,
  });

  console.log(users);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());