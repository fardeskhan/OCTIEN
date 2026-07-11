const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function main() {
  console.log("USERS");
  console.log(await db.user.count());

  console.log("ACCOUNTS");
  console.log(await db.account.count());

  console.log("SESSIONS");
  console.log(await db.session.count());
}

main()
  .finally(() => db.$disconnect());
