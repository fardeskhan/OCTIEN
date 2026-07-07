import { db } from "@/lib/db";
import { Prisma, JournalSourceType } from "@prisma/client";
import { AuditService } from "../audit/audit-service";
import { CorrelationService } from "../audit/correlation-service";

export class FinancialPostingService {
  static async postEntry(params: {
    businessId: string;
    tenantId: string;
    description: string;
    reference?: string;
    sourceType: JournalSourceType | string;
    sourceId?: string | null;
    date?: Date;
    reason?: string;
    approvedBy?: string;
    approvedAt?: Date;
    correlationId?: string; // Optional for legacy support, but required for RC5.9+ workflows
    lines: { accountCode: string; debit?: number; credit?: number; costCenterId?: string }[];
  }) {
    return db.$transaction(async (tx) => {
      const period = await tx.accountingPeriod.findFirst({
        where: {
          businessId: params.businessId,
          startDate: { lte: params.date || new Date() },
          endDate: { gte: params.date || new Date() },
        }
      });
      if (!period) throw new Error("No open accounting period found.");
      if (period.status === "CLOSED") throw new Error("Cannot post to a CLOSED period.");
      if (period.status === "LOCKED" && params.sourceType !== "ADJUSTMENT_JOURNAL") {
          throw new Error("Cannot post operational or manual journals to a LOCKED period. Only adjustments are allowed.");
      }

      if (params.sourceType === "ADJUSTMENT_JOURNAL" && !params.reason) {
          throw new Error("Adjustment journals require a reason.");
      }

      let totalDebit = 0;
      let totalCredit = 0;
      for (const line of params.lines) {
        totalDebit += line.debit || 0;
        totalCredit += line.credit || 0;
      }
      
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        throw new Error(`Journal entry is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`);
      }

      const lineData = [];
      for (const line of params.lines) {
        const account = await tx.ledgerAccount.findUnique({
          where: { businessId_accountCode: { businessId: params.businessId, accountCode: line.accountCode } }
        });
        if (!account) throw new Error(`Account code ${line.accountCode} not found.`);
        if (!account.allowPosting) throw new Error(`Account ${line.accountCode} does not allow posting.`);

        if (params.sourceType === "MANUAL_JOURNAL" && account.isControlAccount) {
            throw new Error(`MANUAL_JOURNAL cannot post directly to control account ${line.accountCode}. Use ADJUSTMENT_JOURNAL instead.`);
        }

        let resolvedCostCenterId = null;
        if (line.costCenterId && (account.accountType === "EXPENSE" || account.accountType === "REVENUE")) {
          const costCenter = await tx.costCenter.findUnique({
            where: { id: line.costCenterId }
          });
          
          if (!costCenter) {
            throw new Error(`Cost Center ${line.costCenterId} not found.`);
          }
          if (costCenter.businessId !== params.businessId) {
            throw new Error(`Cost Center ${line.costCenterId} belongs to a different business.`);
          }
          if (costCenter.status === "INACTIVE") {
            throw new Error(`Cost Center ${line.costCenterId} is INACTIVE and cannot receive allocations.`);
          }

          resolvedCostCenterId = costCenter.id;
        }

        lineData.push({
          businessId: params.businessId,
          accountId: account.id,
          debit: new Prisma.Decimal(line.debit || 0),
          credit: new Prisma.Decimal(line.credit || 0),
          costCenterId: resolvedCostCenterId
        });
      }

      const entry = await tx.journalEntry.create({
        data: {
          businessId: params.businessId,
          date: params.date || new Date(),
          description: params.description,
          reference: params.reference,
          sourceType: params.sourceType as any,
          sourceId: params.sourceId,
          reason: params.reason,
          approvedBy: params.approvedBy,
          approvedAt: params.approvedAt,
          lines: {
            create: lineData
          }
        },
        include: { lines: true }
      });

      const actualCorrelationId = params.correlationId || CorrelationService.generate();

      // Log the Journal Posting business audit event
      await tx.auditEvent.create({
        data: {
          businessId: params.businessId,
          tenantId: params.tenantId,
          entityType: "JOURNAL_ENTRY",
          entityId: entry.id,
          eventType: "JOURNAL_POSTED",
          correlationId: actualCorrelationId,
          performedBy: params.approvedBy || "SYSTEM",
          afterSnapshot: {
            sourceType: params.sourceType,
            sourceId: params.sourceId,
            totalDebit,
            linesCount: params.lines.length
          }
        }
      });

      return entry;
    });
  }
}
