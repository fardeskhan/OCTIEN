import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  databaseHooks: {
    user: {
      create: {
        async before(user) {
          console.log("========== AUTH HOOK ==========");
          console.log("INPUT:", user);

          const result = {
            data: {
              ...user,
              tenantId: "tnt_demo_001",
            },
          };

          console.log("OUTPUT:", result);
          console.log("===============================");

          return result;
        },
      },
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://pilot.cosmy.ai",

    // Vercel
    "https://cosmyerp.vercel.app",

    // Netlify
    "https://cosmyerp.netlify.app",
  ],
});