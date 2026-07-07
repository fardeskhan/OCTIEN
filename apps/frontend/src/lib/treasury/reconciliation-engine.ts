import { db } from "@/lib/db";
import { AuditService } from "../audit/audit-service";
import { Prisma } from "@prisma/client";

export class ReconciliationEngine {
  /**
   * Rule 3: Extracts possible invoice codes from narration (e.g. INV-2026-00124)
   */
  private static extractInvoiceReferences(narration: string): string[] {
    if (!narration) return [];
    // Matches INV-####-#####, SI-#####, COSMY-INV-###
    const regex = /(?:INV-\d{4}-\d+|SI-\d+|COSMY-INV-\d+)/gi;
    const matches = narration.match(regex);
    return matches ? Array.from(new Set(matches.map(m => m.toUpperCase()))) : [];
  }

  /**
   * Runs Auto-Reconciliation on a specific bank account to generate SUGGESTED matches.
   */
  static async runAutoReconciliation(bankAccountId: string) {
    const unmatchedTransactions = await db.bankTransaction.findMany({
      where: {
        bankAccountId,
        status: "UNMATCHED",
        matches: {
          none: { status: { in: ["APPROVED", "SUGGESTED"] } } // don't re-suggest if already suggested
        }
      }
    });

    let suggestionsCreated = 0;

    for (const txn of unmatchedTransactions) {
      const isOutflow = Number(txn.amount) < 0;
      const absAmount = Math.abs(Number(txn.amount));

      // Rule 3: Invoice Pattern Match
      const extractedInvoices = this.extractInvoiceReferences(txn.narration || "");
      let rule3Matched = false;

      if (extractedInvoices.length > 0 && !isOutflow) {
        // Look up CustomerInvoice, then find related CustomerPayment
        const invoice = await db.customerInvoice.findFirst({
          where: { code: { in: extractedInvoices } },
          include: { payments: true }
        });

        if (invoice && invoice.payments.length > 0) {
          // Find payment that matches the amount closely or exactly
          const payment = invoice.payments.find(p => Number(p.amount) === absAmount);
          if (payment) {
            await this.createMatchSuggestion(txn.id, { customerPaymentId: payment.id }, "EXACT");
            suggestionsCreated++;
            rule3Matched = true;
            continue;
          }
        }
      }

      // Rule 2 & 1: Scan recent payments based on Exact Amount and Date (+/- 3 days) or Reference Match
      const dateStart = new Date(txn.date);
      dateStart.setDate(dateStart.getDate() - 3);
      const dateEnd = new Date(txn.date);
      dateEnd.setDate(dateEnd.getDate() + 3);

      if (isOutflow) {
        // Match Supplier Payments (Outflows)
        const possiblePayments = await db.supplierPayment.findMany({
          where: {
            amount: new Prisma.Decimal(absAmount),
            paymentDate: { gte: dateStart, lte: dateEnd }
          }
        });

        // Rule 2: Reference Match
        const refMatch = possiblePayments.find(p => p.reference && txn.reference && p.reference === txn.reference);
        if (refMatch) {
          await this.createMatchSuggestion(txn.id, { supplierPaymentId: refMatch.id }, "HIGH");
          suggestionsCreated++;
          continue;
        }

        // Rule 1: Exact Amount & Date Window
        if (possiblePayments.length === 1) {
          // Unique match in window
          await this.createMatchSuggestion(txn.id, { supplierPaymentId: possiblePayments[0].id }, "HIGH");
          suggestionsCreated++;
        } else if (possiblePayments.length > 1) {
          // Multiple possible matches
          await this.createMatchSuggestion(txn.id, { supplierPaymentId: possiblePayments[0].id }, "LOW");
          suggestionsCreated++;
        }
      } else {
        // Match Customer Payments (Inflows)
        const possiblePayments = await db.customerPayment.findMany({
          where: {
            amount: new Prisma.Decimal(absAmount),
            paymentDate: { gte: dateStart, lte: dateEnd }
          }
        });

        const refMatch = possiblePayments.find(p => p.reference && txn.reference && p.reference === txn.reference);
        if (refMatch) {
          await this.createMatchSuggestion(txn.id, { customerPaymentId: refMatch.id }, "HIGH");
          suggestionsCreated++;
          continue;
        }

        if (possiblePayments.length === 1) {
          await this.createMatchSuggestion(txn.id, { customerPaymentId: possiblePayments[0].id }, "HIGH");
          suggestionsCreated++;
        } else if (possiblePayments.length > 1) {
          await this.createMatchSuggestion(txn.id, { customerPaymentId: possiblePayments[0].id }, "LOW");
          suggestionsCreated++;
        }
      }
    }

    return suggestionsCreated;
  }

  private static async createMatchSuggestion(
    bankTransactionId: string, 
    targets: { customerPaymentId?: string, supplierPaymentId?: string },
    confidence: "EXACT" | "HIGH" | "LOW"
  ) {
    await db.bankTransactionMatch.create({
      data: {
        bankTransactionId,
        customerPaymentId: targets.customerPaymentId,
        supplierPaymentId: targets.supplierPaymentId,
        confidence,
        status: "SUGGESTED"
      }
    });
  }

  /**
   * Approves a SUGGESTED match. Transitions BankTransaction to MATCHED.
   * V1: Requires Manual Approval. Does not auto-post Journal Entries.
   */
  static async approveMatch(matchId: string, userId: string, correlationId: string) {
    const match = await db.bankTransactionMatch.findUnique({
      where: { id: matchId },
      include: { bankTransaction: true }
    });

    if (!match || match.status !== "SUGGESTED") {
      throw new Error("Match not found or already processed");
    }

    // Wrap in transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Approve Match
      const approved = await tx.bankTransactionMatch.update({
        where: { id: matchId },
        data: { status: "APPROVED" }
      });

      // 2. Mark BankTransaction as MATCHED
      const txn = await tx.bankTransaction.update({
        where: { id: match.bankTransactionId },
        data: {
          status: "MATCHED",
          matchedAmount: match.bankTransaction.amount
        }
      });

      // 3. Reject competing SUGGESTED matches for the same bankTransaction
      await tx.bankTransactionMatch.updateMany({
        where: {
          bankTransactionId: match.bankTransactionId,
          status: "SUGGESTED",
          id: { not: matchId }
        },
        data: { status: "REJECTED" }
      });

      return { approved, txn };
    });

    // Audit trail
    await AuditService.logEvent({
      businessId: result.txn.bankAccountId, // Placeholder, usually trace up to business
      tenantId: "SYSTEM", // Placeholder
      entityType: "BANK_TRANSACTION",
      entityId: result.txn.id,
      eventType: "BANK_RECON_APPROVED",
      correlationId,
      performedBy: userId,
      afterSnapshot: { matchId, amount: result.txn.amount }
    });

    return result.approved;
  }
}

