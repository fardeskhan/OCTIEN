import { db } from "@/lib/db";
import crypto from "crypto";

export interface ImportedTransaction {
  date: Date | string;
  narration: string;
  reference?: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

export class BankStatementService {
  /**
   * Imports a batch of standardized JSON transactions.
   */
  static async importTransactions(
    bankAccountId: string,
    statementDate: Date,
    sourceFileName: string,
    transactions: ImportedTransaction[],
    importedBy: string
  ) {
    const bankAccount = await db.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bankAccount) throw new Error("Bank Account not found");

    // Generate a unique hash for the statement to prevent duplicate imports
    const rawData = JSON.stringify(transactions);
    const hash = crypto.createHash("sha256").update(rawData).digest("hex");

    // Idempotency check
    const existing = await db.bankStatement.findUnique({
      where: {
        bankAccountId_hash: {
          bankAccountId,
          hash
        }
      }
    });

    if (existing) {
      throw new Error("Duplicate statement import detected");
    }

    // Process transactions inside a transaction to ensure all-or-nothing
    const statement = await db.$transaction(async (tx) => {
      const stmt = await tx.bankStatement.create({
        data: {
          bankAccountId,
          statementDate,
          sourceFileName,
          hash,
          importedBy
        }
      });

      const txnsToInsert = transactions.map((t) => {
        // Normalize amount to a single signed decimal (Positive = Inflow, Negative = Outflow)
        let amount = 0;
        if (t.credit && t.credit > 0) amount = t.credit; // Inflow
        if (t.debit && t.debit > 0) amount = -t.debit; // Outflow
        
        return {
          bankAccountId,
          statementId: stmt.id,
          date: new Date(t.date),
          amount,
          narration: t.narration,
          reference: t.reference,
          status: "UNMATCHED" as const
        };
      });

      await tx.bankTransaction.createMany({
        data: txnsToInsert
      });

      return stmt;
    });

    return statement;
  }
}
