import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Neon's serverless driver needs a WebSocket implementation in Node (Vercel functions + local dev).
// The driver adapter routes queries through Neon's connection layer, which resolves the
// "Error in PostgreSQL connection: Closed" drops that plain Prisma pooling suffers on Neon.
neonConfig.webSocketConstructor = ws;

// Build the extended client (audit_events are append-only). Kept in one factory so the SAME
// instance can be cached across dev hot-reloads — otherwise each reload spawns a new client and
// exhausts / drops Neon (serverless Postgres) connections.
function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const base = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  return base.$extends({
    query: {
      auditEvent: {
        async update() {
          throw new Error("Audit events are append-only and cannot be updated.");
        },
        async updateMany() {
          throw new Error("Audit events are append-only and cannot be updated.");
        },
        async delete() {
          throw new Error("Audit events are append-only and cannot be deleted.");
        },
        async deleteMany() {
          throw new Error("Audit events are append-only and cannot be deleted.");
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

const client = globalForPrisma.prisma ?? createPrismaClient();

// Cache the singleton in every non-production environment (dev + Vercel preview) so hot-reloads and
// warm serverless invocations reuse one connection pool.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;

// Cast to PrismaClient so the extension's added complexity doesn't ripple across the app's call sites.
export const db = client as unknown as PrismaClient;

// Soft-delete filter. Models in this schema mark deletion with a `deletedAt` timestamp — NOT a
// "DELETED" status enum (no model's status enum has that value). Filtering on a non-existent enum
// value throws PrismaClientValidationError, so this must key off `deletedAt`.
export const withActiveRecords = (query: any = {}) => ({ ...query, where: { ...(query.where || {}), deletedAt: null } });
