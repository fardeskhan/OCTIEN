import { db } from "@/lib/db";
import { AccountTypeEnum } from "@prisma/client";

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountTypeEnum;
  debit: number;
  credit: number;
  balance: number; // Net balance based on normal balance rule
}

export class TrialBalanceService {
  /**
   * Generates a Trial Balance for a business up to a specific date.
   */
  static async generate(businessId: string, asOfDate: Date): Promise<{ accounts: AccountBalance[], totalDebit: number, totalCredit: number, isBalanced: boolean }> {
    const accounts = await db.ledgerAccount.findMany({
      where: { businessId },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              date: { lte: asOfDate }
            }
          }
        }
      }
    });

    let totalDebit = 0;
    let totalCredit = 0;
    const balances: AccountBalance[] = [];

    for (const account of accounts) {
      let debit = 0;
      let credit = 0;

      for (const line of account.journalLines) {
        debit += Number(line.debit || 0);
        credit += Number(line.credit || 0);
      }

      if (debit === 0 && credit === 0) continue; // Skip zero balance accounts

      let balance = 0;
      if (account.normalBalance === "DEBIT") {
        balance = debit - credit;
      } else {
        balance = credit - debit;
      }

      totalDebit += debit;
      totalCredit += credit;

      balances.push({
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.name,
        accountType: account.accountType,
        debit,
        credit,
        balance
      });
    }

    // Sort by Account Code
    balances.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return {
      accounts: balances,
      totalDebit,
      totalCredit,
      isBalanced
    };
  }
}
