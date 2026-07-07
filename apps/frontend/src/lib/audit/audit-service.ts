
import { db } from "@/lib/db";
import { AuditEventType, Prisma } from "@prisma/client";

export class AuditService {
  /**
   * Logs an append-only business event to the Audit Center.
   * Enforces compact JSON snapshots and standard AuditEventTypes.
   */
  static async logEvent(params: {
    businessId: string;
    tenantId: string;
    entityType: string;
    entityId: string;
    eventType: AuditEventType;
    correlationId: string;
    performedBy?: string;
    beforeSnapshot?: any;
    afterSnapshot?: any;
    metadata?: any;
  }) {
    // ADR-AUD-001: Append-only audit logs. Never updated.
    return await db.auditEvent.create({
      data: {
        businessId: params.businessId,
        tenantId: params.tenantId,
        entityType: params.entityType,
        entityId: params.entityId,
        eventType: params.eventType,
        correlationId: params.correlationId,
        performedBy: params.performedBy || "SYSTEM",
        beforeSnapshot: params.beforeSnapshot ? (params.beforeSnapshot as Prisma.InputJsonValue) : Prisma.DbNull,
        afterSnapshot: params.afterSnapshot ? (params.afterSnapshot as Prisma.InputJsonValue) : Prisma.DbNull,
        metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.DbNull
      }
    });
  }

  /**
   * Fetches the complete timeline for a specific entity.
   */
  static async getEntityTimeline(businessId: string, entityType: string, entityId: string) {
    return await db.auditEvent.findMany({
      where: { businessId, entityType, entityId },
      orderBy: { createdAt: "asc" }
    });
  }

  /**
   * Fetches the complete cross-domain workflow timeline using a correlation ID.
   * This reconstructs the entire business transaction chain.
   */
  static async getWorkflowTimeline(businessId: string, correlationId: string) {
    return await db.auditEvent.findMany({
      where: { businessId, correlationId },
      orderBy: { createdAt: "asc" }
    });
  }
}

