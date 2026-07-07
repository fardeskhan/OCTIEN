import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaClient = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export const db = prismaClient.$extends({
  query: {
    auditEvent: {
      async update({ args, query }) {
        throw new Error("Audit events are append-only and cannot be updated.");
      },
      async updateMany({ args, query }) {
        throw new Error("Audit events are append-only and cannot be updated.");
      },
      async delete({ args, query }) {
        throw new Error("Audit events are append-only and cannot be deleted.");
      },
      async deleteMany({ args, query }) {
        throw new Error("Audit events are append-only and cannot be deleted.");
      }
    }
  }
}) as unknown as PrismaClient; // Cast back to bypass type complexities for extensions across the app

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient;
export const withActiveRecords = (query: any = {}) => ({ ...query, where: { ...(query.where || {}), status: { not: 'DELETED' } } });
