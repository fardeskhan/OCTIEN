import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";

/**
 * Append an entry to the tenant audit log. Fire-and-forget from server actions —
 * an audit failure must never break the business operation itself.
 */
export async function logAudit(entry: {
  action: string; // e.g. "create", "update", "void", "generate"
  resource: string; // e.g. "invoice", "business", "eway_bill"
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { tenantId, currentBusinessId, userId } = await requireBusinessContext();
    await db.auditLog.create({
      data: {
        tenantId,
        businessId: currentBusinessId,
        actorId: userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined,
      },
    });
  } catch {
    // Never let audit failures break the underlying action.
  }
}
