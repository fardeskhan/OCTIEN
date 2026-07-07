import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export class BankService {
  /**
   * Creates a Bank Account and provisions a dedicated 1:1 Ledger GL Account as a child of 1000.
   */
  static async createBankAccount(params: {
    businessId: string;
    name: string;
    accountNumber: string;
    ifscCode?: string;
    openingBalance?: number;
    currencyId?: string;
  }) {
    return db.$transaction(async (tx) => {
      // Find the parent "1000 Cash & Bank"
      const parentGL = await tx.ledgerAccount.findUnique({
        where: { businessId_accountCode: { businessId: params.businessId, accountCode: "1000" } }
      });

      if (!parentGL) {
        throw new Error("System account '1000 Cash & Bank' not found.");
      }

      // Generate a new child ledger account code, e.g., 1010, 1020
      const existingBankAccounts = await tx.bankAccount.count({
        where: { businessId: params.businessId }
      });
      
      const newCode = `10${(existingBankAccounts + 1) * 10}`;

      // Create Ledger Account
      const ledgerAccount = await tx.ledgerAccount.create({
        data: {
          businessId: params.businessId,
          accountCode: newCode,
          name: params.name,
          accountType: "ASSET",
          normalBalance: "DEBIT",
          isControlAccount: true, // Crucial: Protected from manual journals
          isSystem: false, // User created
          allowPosting: true,
          parentAccountId: parentGL.id
        }
      });

      // Create Bank Account
      const bankAccount = await tx.bankAccount.create({
        data: {
          businessId: params.businessId,
          name: params.name,
          accountNumber: params.accountNumber,
          ifscCode: params.ifscCode,
          openingBalance: new Prisma.Decimal(params.openingBalance || 0),
          currencyId: params.currencyId,
          ledgerAccountId: ledgerAccount.id
        }
      });

      return bankAccount;
    });
  }

  /**
   * Imports an immutable Bank Statement with its parsed transactions.
   */
  static async importStatement(params: {
    bankAccountId: string;
    importedBy: string;
    statementDate: Date;
    sourceFileName: string;
    hash: string;
    transactions: {
      date: Date;
      amount: number;
      reference?: string;
      narration?: string;
    }[];
  }) {
    return db.$transaction(async (tx) => {
      // 1. Verify Bank Account
      const bankAccount = await tx.bankAccount.findUnique({
        where: { id: params.bankAccountId }
      });
      if (!bankAccount) throw new Error("Bank Account not found.");

      // 2. Prevent duplicate import based on hash
      const existingStatement = await tx.bankStatement.findFirst({
        where: { bankAccountId: params.bankAccountId, hash: params.hash }
      });
      if (existingStatement) throw new Error("This statement file has already been imported.");

      // 3. Create Statement and Lines
      const statement = await tx.bankStatement.create({
        data: {
          bankAccountId: params.bankAccountId,
          importedBy: params.importedBy,
          statementDate: params.statementDate,
          sourceFileName: params.sourceFileName,
          hash: params.hash,
          transactions: {
            create: params.transactions.map(t => ({
              bankAccountId: params.bankAccountId,
              date: t.date,
              amount: new Prisma.Decimal(t.amount),
              reference: t.reference,
              narration: t.narration,
              status: "UNMATCHED"
            }))
          }
        },
        include: { transactions: true }
      });

      return statement;
    });
  }

  /**
   * Retrieves the three critical balances as requested in ADR-FIN-003.
   * - Book Balance: Real-time GL account balance (Operational).
   * - Statement Balance: Bank opening balance + sum of all imported transactions.
   * - Difference: Statement Balance - Book Balance
   */
  static async getBankBalances(businessId: string, bankAccountId: string) {
    const bankAccount = await db.bankAccount.findUnique({
      where: { id: bankAccountId },
      include: { transactions: true }
    });

    if (!bankAccount) throw new Error("Bank Account not found.");

    // 1. Calculate Book Balance (from GL)
    // We derive it by querying JournalLines mapping to this ledgerAccountId
    const journalLines = await db.journalLine.findMany({
      where: { accountId: bankAccount.ledgerAccountId }
    });
    
    let bookBalance = new Prisma.Decimal(0);
    for (const line of journalLines) {
      // Assets are DEBIT normal. So DEBIT is positive, CREDIT is negative.
      bookBalance = bookBalance.add(line.debit || 0).sub(line.credit || 0);
    }

    // 2. Calculate Statement Balance (from BankStatement imports)
    let statementBalance = bankAccount.openingBalance;
    for (const txn of bankAccount.transactions) {
      statementBalance = statementBalance.add(txn.amount);
    }

    // 3. Difference
    const difference = statementBalance.sub(bookBalance);

    return {
      bookBalance: bookBalance.toNumber(),
      statementBalance: statementBalance.toNumber(),
      difference: difference.toNumber()
    };
  }
}
