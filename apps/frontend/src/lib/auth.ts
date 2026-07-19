import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  user: {
    additionalFields: {
      tenantId: {
        type: "string",
        required: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },

  databaseHooks: {
    user: {
      create: {
        async before(user) {
          return {
            data: {
              ...user,
              tenantId: "tnt_demo_001",
            },
          };
        },
      },
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://pilot.cosmy.ai",

    // Vercel
    "https://cosmyerp-mu.vercel.app",

    // Netlify
    "https://cosmyerp.netlify.app",
  ],

});