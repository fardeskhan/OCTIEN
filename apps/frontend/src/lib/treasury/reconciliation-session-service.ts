import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export class ReconciliationSessionService {
  /**
   * Creates a draft Reconciliation Session and Summary for a period.
   */
  static async createSession(
    bankAccountId: string,
    startDate: Date,
    endDate: Date,
    statementBalance: number
  ) {
    const account = await db.bankAccount.findUnique({
      where: { id: bankAccountId }
    });
    if (!account) throw new Error("Bank Account not found");

    // Book Balance calculation: Opening Balance + All MATCHED transactions up to endDate
    const matchedTransactions = await db.bankTransaction.aggregate({
      where: {
        bankAccountId,
        date: { lte: endDate },
        status: "MATCHED"
      },
      _sum: {
        amount: true
      }
    });

    const sumMatched = Number(matchedTransactions._sum.amount || 0);
    const bookBalance = Number(account.openingBalance) + sumMatched;

    // Unmatched amount (in period)
    const unmatchedTransactions = await db.bankTransaction.aggregate({
      where: {
        bankAccountId,
        date: { gte: startDate, lte: endDate },
        status: "UNMATCHED"
      },
      _sum: {
        amount: true
      }
    });
    const unmatchedAmount = Number(unmatchedTransactions._sum.amount || 0);

    // Difference between Book and Statement
    // A perfectly reconciled book would mean Book Balance + Unmatched Items = Statement Balance?
    // Actually, Book Balance is our internal GL representation of cleared items.
    // The Statement Balance should exactly match Book Balance + Unmatched Amount if we imported everything correctly,
    // Or if there are untracked items on the book.
    // Difference = Statement Balance - Book Balance.
    const difference = statementBalance - bookBalance;

    return await db.$transaction(async (tx) => {
      const session = await tx.bankReconciliationSession.create({
        data: {
          bankAccountId,
          startDate,
          endDate,
          status: "DRAFT"
        }
      });

      const summary = await tx.bankReconciliationSummary.create({
        data: {
          bankAccountId,
          bookBalance,
          statementBalance,
          matchedAmount: sumMatched,
          unmatchedAmount,
          difference,
          asOfDate: endDate
        }
      });

      return { session, summary };
    });
  }

  static async lockSession(sessionId: string, userId: string) {
    const session = await db.bankReconciliationSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");

    return await db.bankReconciliationSession.update({
      where: { id: sessionId },
      data: {
        status: "LOCKED",
        lockedAt: new Date(),
        lockedBy: userId
      }
    });
  }
}
