import { db } from "@/lib/db";
import { NicComplianceProvider } from "./nic-compliance-provider";
import { AuditService } from "../audit/audit-service";
import { DocumentService } from "../documents/document-service";

export class ComplianceJobProcessor {
  private static provider = new NicComplianceProvider();

  private static getRetryDelayMinutes(attempts: number): number {
    switch (attempts) {
      case 1: return 1;
      case 2: return 5;
      case 3: return 15;
      case 4: return 60;
      default: return -1; // Max retries exceeded
    }
  }

  public static async processPendingJobs() {
    console.log("[ComplianceJobProcessor] Scanning for pending jobs...");

    const jobs = await db.complianceJob.findMany({
      where: {
        status: { in: ["PENDING", "RETRY_PENDING"] },
        nextAttemptAt: { lte: new Date() }
      },
      orderBy: { createdAt: "asc" },
      take: 10 // process in batches
    });

    if (jobs.length === 0) {
      console.log("[ComplianceJobProcessor] No pending jobs found.");
      return 0;
    }

    console.log(`[ComplianceJobProcessor] Found ${jobs.length} jobs to process.`);
    let processedCount = 0;

    for (const job of jobs) {
      try {
        await this.processJob(job);
        processedCount++;
      } catch (err) {
        console.error(`[ComplianceJobProcessor] Critical error processing job ${job.id}:`, err);
      }
    }

    return processedCount;
  }

  private static async processJob(job: any) {
    // 1. Lock job (set to PROCESSING) atomically (RC6.0C Hardening)
    const { count } = await db.complianceJob.updateMany({
      where: { 
        id: job.id,
        status: job.status // Must still be exactly what we queried (PENDING or RETRY_PENDING)
      },
      data: { status: "PROCESSING" }
    });

    if (count === 0) {
      console.log(`[ComplianceJobProcessor] Job ${job.id} already picked up by another worker. Skipping.`);
      return; // Lock failed, another worker took it
    }

    const payload = job.payload as any;
    let success = false;
    let response: any;
    let errorMsg = null;

    // 2. Execute via Provider
    try {
      if (job.type === "GENERATE_IRN") {
        response = await this.provider.generateIRN(payload.invoiceData);
        success = response.success;
        if (!success) errorMsg = response.error || response.message;
      } else if (job.type === "GENERATE_EWAY") {
        response = await this.provider.generateEWay(payload.ewayData);
        success = response.success;
        if (!success) errorMsg = response.error || response.message;
      }
    } catch (e: any) {
      success = false;
      errorMsg = e.message;
    }

    const currentAttempt = job.attempts + 1;

    // 3. Handle Result
    if (success) {
      // 3A. Success Flow
      await db.complianceJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          attempts: currentAttempt,
          processedAt: new Date(),
          lastError: null
        }
      });

      if (job.type === "GENERATE_IRN") {
        await this.handleIrnSuccess(job, payload, response, currentAttempt);
      } else if (job.type === "GENERATE_EWAY") {
        await this.handleEWaySuccess(job, payload, response, currentAttempt);
      }
    } else {
      // 3B. Failure Flow (Timeout/Error)
      const delayMins = this.getRetryDelayMinutes(currentAttempt);
      
      if (delayMins === -1 || currentAttempt >= 5) {
        // Max retries exceeded -> FAILED
        await db.complianceJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            attempts: currentAttempt,
            lastError: errorMsg,
            processedAt: new Date()
          }
        });
        if (job.type === "GENERATE_IRN") {
          await this.handleIrnFailure(job, payload, errorMsg, currentAttempt, true);
        } else if (job.type === "GENERATE_EWAY") {
          await this.handleEWayFailure(job, payload, errorMsg, currentAttempt, true);
        }
      } else {
        // Retry -> RETRY_PENDING
        const nextAttempt = new Date(Date.now() + delayMins * 60000);
        await db.complianceJob.update({
          where: { id: job.id },
          data: {
            status: "RETRY_PENDING",
            attempts: currentAttempt,
            lastError: errorMsg,
            nextAttemptAt: nextAttempt,
            processedAt: new Date()
          }
        });
        if (job.type === "GENERATE_IRN") {
          await this.handleIrnFailure(job, payload, errorMsg, currentAttempt, false);
        } else if (job.type === "GENERATE_EWAY") {
          await this.handleEWayFailure(job, payload, errorMsg, currentAttempt, false);
        }
      }
    }
  }

  // --- Success Handlers ---
  private static async handleIrnSuccess(job: any, payload: any, response: any, attempts: number) {
    const updated = await db.eInvoice.update({
      where: { id: payload.einvoiceId },
      data: {
        status: "GENERATED",
        irn: response.irn,
        generationAttempts: attempts,
        lastError: null
      }
    });

    if (response.pdfBuffer) {
      await DocumentService.uploadDocument(
        job.businessId,
        job.tenantId,
        payload.userId,
        "E_INVOICE",
        updated.id,
        response.pdfBuffer,
        `IRN_${response.irn}.pdf`,
        "application/pdf"
      );
    }

    await AuditService.logEvent({
      businessId: job.businessId,
      tenantId: job.tenantId,
      entityType: "E_INVOICE",
      entityId: updated.id,
      eventType: "IRN_GENERATED",
      correlationId: job.correlationId,
      performedBy: payload.userId,
      afterSnapshot: { irn: response.irn, attempts, jobId: job.id }
    });
  }

  private static async handleEWaySuccess(job: any, payload: any, response: any, attempts: number) {
    const updated = await db.eWayBill.update({
      where: { id: payload.ewayBillId },
      data: {
        status: "GENERATED",
        ewbNumber: response.ewayBillNo,
        validUntil: response.validUpto,
        generationAttempts: attempts,
        lastError: null
      }
    });

    if (response.pdfBuffer) {
      await DocumentService.uploadDocument(
        job.businessId,
        job.tenantId,
        payload.userId,
        "E_WAY_BILL",
        updated.id,
        response.pdfBuffer,
        `EWAY_${response.ewayBillNo}.pdf`,
        "application/pdf"
      );
    }

    await AuditService.logEvent({
      businessId: job.businessId,
      tenantId: job.tenantId,
      entityType: "E_WAY_BILL",
      entityId: updated.id,
      eventType: "EWAY_GENERATED",
      correlationId: job.correlationId,
      performedBy: payload.userId,
      afterSnapshot: { ewbNumber: response.ewayBillNo, attempts, jobId: job.id }
    });
  }

  // --- Failure Handlers ---
  private static async handleIrnFailure(job: any, payload: any, errorMsg: string, attempts: number, isFinal: boolean) {
    await db.eInvoice.update({
      where: { id: payload.einvoiceId },
      data: {
        status: isFinal ? "FAILED" : "PENDING", // Keep PENDING if retrying
        generationAttempts: attempts,
        lastError: errorMsg
      }
    });

    await AuditService.logEvent({
      businessId: job.businessId,
      tenantId: job.tenantId,
      entityType: "E_INVOICE",
      entityId: payload.einvoiceId,
      eventType: isFinal ? "IRN_FAILED" : "IRN_RETRY_SCHEDULED",
      correlationId: job.correlationId,
      performedBy: payload.userId,
      afterSnapshot: { error: errorMsg, attempts, jobId: job.id }
    });
  }

  private static async handleEWayFailure(job: any, payload: any, errorMsg: string, attempts: number, isFinal: boolean) {
    await db.eWayBill.update({
      where: { id: payload.ewayBillId },
      data: {
        status: isFinal ? "FAILED" : "PENDING",
        generationAttempts: attempts,
        lastError: errorMsg
      }
    });

    await AuditService.logEvent({
      businessId: job.businessId,
      tenantId: job.tenantId,
      entityType: "E_WAY_BILL",
      entityId: payload.ewayBillId,
      eventType: isFinal ? "EWAY_FAILED" : "EWAY_RETRY_SCHEDULED",
      correlationId: job.correlationId,
      performedBy: payload.userId,
      afterSnapshot: { error: errorMsg, attempts, jobId: job.id }
    });
  }
}
