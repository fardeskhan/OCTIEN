const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const accounts = await prisma.account.findMany({
        where: {
            userId: 'cmra06ohs000gu8wkkgnwzivj',
        },
    });

    console.log(accounts);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());