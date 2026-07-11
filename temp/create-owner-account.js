// temp/create-owner-account.js

const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("@better-auth/utils/password");

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: {
            email: "owner@cosmy.ai",
        },
    });

    if (!user) {
        throw new Error("owner user not found");
    }

    const existing = await prisma.account.findFirst({
        where: {
            userId: user.id,
            providerId: "credential",
        },
    });

    if (existing) {
        console.log("credential account already exists");
        return;
    }

    const passwordHash = await hashPassword("Owner@123");

    await prisma.account.create({
        data: {
            accountId: user.email,
            providerId: "credential",
            userId: user.id,
            password: passwordHash,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    console.log("SUCCESS");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());