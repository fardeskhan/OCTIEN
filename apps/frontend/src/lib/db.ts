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

// Soft-delete filter. Models in this schema mark deletion with a `deletedAt` timestamp — NOT a
// "DELETED" status enum (no model's status enum has that value). Filtering on a non-existent enum
// value throws PrismaClientValidationError, so this must key off `deletedAt`.
export const withActiveRecords = (query: any = {}) => ({ ...query, where: { ...(query.where || {}), deletedAt: null } });
