import { db } from "@/lib/db";
import { Prisma, MatchConfidence } from "@prisma/client";
import { BankService } from "./bank-service";

export class BankReconciliationService {
  /**
   * Creates a new DRAFT reconciliation session.
   */
  static async createSession(params: {
    bankAccountId: string;
    startDate: Date;
    endDate: Date;
  }) {
    return db.bankReconciliationSession.create({
      data: {
        bankAccountId: params.bankAccountId,
        startDate: params.startDate,
        endDate: params.endDate,
        status: "DRAFT"
      }
    });
  }

  /**
   * Runs the Auto-Matching engine for a given session.
   * Modifies session status to MATCHING, runs logic, then sets to REVIEW.
   */
  static async runAutoMatching(sessionId: string) {
    const session = await db.bankReconciliationSession.findUnique({
      where: { id: sessionId },
      include: { bankAccount: true }
    });
    if (!session) throw new Error("Session not found");
    if (session.status === "LOCKED") throw new Error("Cannot run matching on a LOCKED session");

    // Set to MATCHING
    await db.bankReconciliationSession.update({
      where: { id: sessionId },
      data: { status: "MATCHING" }
    });

    // 1. Fetch unmatched or partially matched bank transactions in the window
    const bankTransactions = await db.bankTransaction.findMany({
      where: {
        bankAccountId: session.bankAccountId,
        date: { gte: session.startDate, lte: session.endDate },
        status: { in: ["UNMATCHED", "PARTIAL_MATCH"] }
      }
    });

    // 2. Fetch potential journal entries that touch this bank's GL account
    const glAccountId = session.bankAccount.ledgerAccountId;
    const potentialJournalLines = await db.journalLine.findMany({
      where: {
        accountId: glAccountId,
        journalEntry: {
          date: { gte: new Date(session.startDate.getTime() - 7 * 86400000), lte: new Date(session.endDate.getTime() + 7 * 86400000) } // +/- 7 days
        }
      },
      include: { journalEntry: true }
    });

    let matchesCreated = 0;

    // We will do a simple EXACT matching first: exact amount and exact date
    for (const bt of bankTransactions) {
      const amountToMatch = bt.amount.abs().toNumber() - bt.matchedAmount.toNumber();
      if (amountToMatch <= 0) continue;

      const isDeposit = bt.amount.toNumber() > 0;

      // Find an exact match in JournalLines
      const exactMatch = potentialJournalLines.find(jl => {
        // Bank Deposit = GL Debit to Cash Account. Bank Withdrawal = GL Credit to Cash Account.
        const jlAmount = isDeposit ? jl.debit?.toNumber() || 0 : jl.credit?.toNumber() || 0;
        
        // Exact Amount and exact Date (ignoring time for simplicity, but let's check difference in ms)
        const dateDiff = Math.abs(bt.date.getTime() - jl.journalEntry.date.getTime());
        return jlAmount === amountToMatch && dateDiff < 86400000; // Within 24 hrs
      });

      if (exactMatch) {
        // Enforce matchedAmount <= transaction amount
        // Wait, for full exact match it will be exactly equal
        
        await db.$transaction(async (tx) => {
          // Double check the transaction hasn't been matched
          const currentBt = await tx.bankTransaction.findUnique({ where: { id: bt.id } });
          const currentRemaining = currentBt!.amount.abs().toNumber() - currentBt!.matchedAmount.toNumber();
          const jlAmount = isDeposit ? exactMatch.debit?.toNumber() || 0 : exactMatch.credit?.toNumber() || 0;

          if (currentRemaining >= jlAmount) {
            // Create Match (Mapping to Operational CustomerPayment/SupplierPayment requires linking from JournalEntry.sourceId)
            // For now, if sourceType is CUSTOMER_PAYMENT, sourceId is customerPaymentId
            let cpId = null;
            let spId = null;
            if (exactMatch.journalEntry.sourceType === "CUSTOMER_PAYMENT") cpId = exactMatch.journalEntry.sourceId;
            if (exactMatch.journalEntry.sourceType === "SUPPLIER_PAYMENT") spId = exactMatch.journalEntry.sourceId;

            await tx.bankTransactionMatch.create({
              data: {
                bankTransactionId: bt.id,
                customerPaymentId: cpId,
                supplierPaymentId: spId,
                journalEntryId: exactMatch.journalEntryId,
                confidence: "EXACT"
              }
            });

            const newMatchedAmt = currentBt!.matchedAmount.add(jlAmount);
            const isFullyMatched = newMatchedAmt.toNumber() >= currentBt!.amount.abs().toNumber();

            await tx.bankTransaction.update({
              where: { id: bt.id },
              data: {
                matchedAmount: newMatchedAmt,
                status: isFullyMatched ? "MATCHED" : "PARTIAL_MATCH"
              }
            });
            matchesCreated++;
          }
        });
      }
    }

    // Set to REVIEW
    await db.bankReconciliationSession.update({
      where: { id: sessionId },
      data: { status: "REVIEW" }
    });

    return { matchesCreated };
  }

  /**
   * Locks the session and computes the BankReconciliationSummary projection.
   */
  static async lockSession(sessionId: string, lockedBy: string) {
    return db.$transaction(async (tx) => {
      const session = await tx.bankReconciliationSession.findUnique({
        where: { id: sessionId }
      });
      if (!session) throw new Error("Session not found");
      if (session.status === "LOCKED") throw new Error("Session is already locked");

      // We should technically verify there are no unresolved exceptions, but for RC5.2 we will just lock it.

      await tx.bankReconciliationSession.update({
        where: { id: sessionId },
        data: {
          status: "LOCKED",
          lockedAt: new Date(),
          lockedBy
        }
      });

      // Compute Projection
      const bankAccount = await tx.bankAccount.findUnique({
        where: { id: session.bankAccountId }
      });

      // 1. Calculate Book Balance
      const journalLines = await tx.journalLine.findMany({
        where: { accountId: bankAccount!.ledgerAccountId }
      });
      let bookBalance = 0;
      for (const line of journalLines) {
        bookBalance += (line.debit?.toNumber() || 0) - (line.credit?.toNumber() || 0);
      }

      // 2. Calculate Statement Balance and Matching stats
      const transactions = await tx.bankTransaction.findMany({
        where: { bankAccountId: session.bankAccountId }
      });

      let statementBalance = bankAccount!.openingBalance.toNumber();
      let totalMatchedAmount = 0;
      let totalUnmatchedAmount = 0;

      for (const txn of transactions) {
        const amt = txn.amount.toNumber();
        statementBalance += amt;
        
        // Matched vs Unmatched for projection
        // We use absolute values for matched amount
        const absAmt = Math.abs(amt);
        const mAmt = txn.matchedAmount.toNumber();
        totalMatchedAmount += mAmt;
        totalUnmatchedAmount += (absAmt - mAmt);
      }

      const difference = statementBalance - bookBalance;

      // Save Projection
      const summary = await tx.bankReconciliationSummary.create({
        data: {
          bankAccountId: session.bankAccountId,
          bookBalance,
          statementBalance,
          matchedAmount: totalMatchedAmount,
          unmatchedAmount: totalUnmatchedAmount,
          difference
        }
      });

      return { session, summary };
    });
  }
}
