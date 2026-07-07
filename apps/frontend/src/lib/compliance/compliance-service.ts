import { db } from "@/lib/db";
import { AuditService } from "../audit/audit-service";

export class ComplianceService {
  /**
   * Submits a GENERATE_IRN job for a Customer Invoice.
   * Implementation ADR-COMP-002: Does not fail the Invoice transaction.
   * Implementation RC6.0B: Pushes to ComplianceJob queue asynchronously.
   */
  static async processInvoiceCompliance(
    businessId: string,
    tenantId: string,
    invoiceId: string,
    userId: string,
    correlationId: string,
    invoiceData: any // Payload for NIC
  ) {
    // We expect the EInvoice record to exist, or we create it
    let einvoice = await db.eInvoice.findFirst({ where: { customerInvoiceId: invoiceId } });
    if (!einvoice) {
      einvoice = await db.eInvoice.create({
        data: {
          customerInvoiceId: invoiceId,
          status: "PENDING"
        }
      });
    } else if (einvoice.status === "GENERATED") {
      // Idempotency: skip if already generated
      return einvoice;
    }

    // Submit Job
    const job = await db.complianceJob.create({
      data: {
        businessId,
        tenantId,
        type: "GENERATE_IRN",
        status: "PENDING",
        correlationId,
        nextAttemptAt: new Date(),
        payload: {
          invoiceId,
          einvoiceId: einvoice.id,
          userId,
          invoiceData
        }
      }
    });

    await AuditService.logEvent({
      businessId,
      tenantId,
      entityType: "E_INVOICE",
      entityId: einvoice.id,
      eventType: "IRN_REQUESTED",
      correlationId,
      performedBy: userId,
      afterSnapshot: { jobId: job.id, attempts: einvoice.generationAttempts }
    });

    return einvoice;
  }

  /**
   * Submits a GENERATE_EWAY job for an EWayBill.
   */
  static async processEWayBillCompliance(
    businessId: string,
    tenantId: string,
    ewayBillId: string,
    userId: string,
    correlationId: string,
    ewayData: any // Payload for NIC
  ) {
    let eway = await db.eWayBill.findUnique({ where: { id: ewayBillId } });
    if (!eway) throw new Error("EWayBill not found");
    if (eway.status === "GENERATED") {
      return eway; // Idempotency
    }

    // Submit Job
    const job = await db.complianceJob.create({
      data: {
        businessId,
        tenantId,
        type: "GENERATE_EWAY",
        status: "PENDING",
        correlationId,
        nextAttemptAt: new Date(),
        payload: {
          ewayBillId: eway.id,
          invoiceId: eway.invoiceId,
          userId,
          ewayData
        }
      }
    });

    await AuditService.logEvent({
      businessId,
      tenantId,
      entityType: "E_WAY_BILL",
      entityId: eway.id,
      eventType: "EWAY_REQUESTED",
      correlationId,
      performedBy: userId,
      afterSnapshot: { jobId: job.id, attempts: eway.generationAttempts }
    });

    return eway;
  }
}

