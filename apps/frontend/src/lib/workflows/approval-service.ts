
import { ApprovalSourceType, ApprovalStatus, ApprovalActionType } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/server-auth";
import * as crypto from "crypto";
import { AuditService } from "../audit/audit-service";
import { CorrelationService } from "../audit/correlation-service";


export class ApprovalService {
  static generateHash(snapshot: any): string {
    const stringified = JSON.stringify(snapshot, Object.keys(snapshot).sort());
    return crypto.createHash("sha256").update(stringified).digest("hex");
  }

  static async requestApproval(
    businessId: string,
    tenantId: string,
    userId: string,
    sourceType: ApprovalSourceType,
    sourceId: string,
    snapshot: any,
    correlationId: string
  ) {
    const entityHash = this.generateHash(snapshot);
    const snapshotJson = JSON.stringify(snapshot);

    await db.approvalRequest.updateMany({
      where: { businessId, sourceType, sourceId, status: "PENDING" },
      data: { status: "CANCELLED" }
    });

    const request = await db.approvalRequest.create({
      data: {
        businessId,
        tenantId,
        sourceType,
        sourceId,
        entityHash,
        snapshotJson,
        status: "PENDING",
        actions: {
          create: {
            actionType: "REQUESTED",
            performedBy: userId
          }
        }
      }
    });

    await AuditService.logEvent({
      businessId,
      tenantId,
      entityType: "APPROVAL_REQUEST",
      entityId: request.id,
      eventType: "APPROVAL_REQUESTED",
      correlationId,
      performedBy: userId,
      afterSnapshot: { sourceType, sourceId }
    });

    return request;
  }

  static async validateHashOrInvalidate(requestId: string, currentSnapshot: any, correlationId: string) {
    const request = await db.approvalRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (request.status !== "PENDING") throw new Error(`Cannot action a request in status ${request.status}`);

    const currentHash = this.generateHash(currentSnapshot);
    
    if (currentHash !== request.entityHash) {
      await this.invalidate(requestId, "SYSTEM", correlationId, request.businessId, request.tenantId, "Entity hash mismatch. Document was modified after approval was requested.");
      throw new Error("Approval invalidated: Document was modified since approval request.");
    }
    
    return request;
  }

  static async approve(requestId: string, userId: string, tenantId: string, currentSnapshot: any, correlationId: string, notes?: string) {
    if (process.env.SKIP_AUTH_CHECKS !== "true") {
      await requirePermission("finance.approve");
    }
    
    const request = await this.validateHashOrInvalidate(requestId, currentSnapshot, correlationId);

    const updated = await db.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        actions: {
          create: {
            actionType: "APPROVED",
            performedBy: userId,
            notes
          }
        }
      }
    });

    await AuditService.logEvent({
      businessId: request.businessId,
      tenantId: request.tenantId,
      entityType: "APPROVAL_REQUEST",
      entityId: request.id,
      eventType: "APPROVED",
      correlationId,
      performedBy: userId,
      afterSnapshot: { notes }
    });

    return updated;
  }

  static async reject(requestId: string, userId: string, tenantId: string, currentSnapshot: any, correlationId: string, notes?: string) {
    if (process.env.SKIP_AUTH_CHECKS !== "true") {
      await requirePermission("finance.approve");
    }
    const request = await this.validateHashOrInvalidate(requestId, currentSnapshot, correlationId);

    const updated = await db.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        actions: {
          create: {
            actionType: "REJECTED",
            performedBy: userId,
            notes
          }
        }
      }
    });

    await AuditService.logEvent({
      businessId: request.businessId,
      tenantId: request.tenantId,
      entityType: "APPROVAL_REQUEST",
      entityId: request.id,
      eventType: "REJECTED",
      correlationId,
      performedBy: userId,
      afterSnapshot: { notes }
    });

    return updated;
  }

  static async invalidate(requestId: string, userId: string, correlationId: string, businessId: string, tenantId: string, notes?: string) {
    const updated = await db.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: "INVALIDATED",
        actions: {
          create: {
            actionType: "INVALIDATED",
            performedBy: userId,
            notes
          }
        }
      }
    });

    await AuditService.logEvent({
      businessId,
      tenantId,
      entityType: "APPROVAL_REQUEST",
      entityId: requestId,
      eventType: "INVALIDATED",
      correlationId,
      performedBy: userId,
      afterSnapshot: { notes }
    });

    return updated;
  }
}

