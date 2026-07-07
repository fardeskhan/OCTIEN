import { TrialBalanceService } from "./trial-balance-service";
import { ProfitLossService } from "./profit-loss-service";

export class BalanceSheetService {
  /**
   * Generates a Balance Sheet as of a specific date.
   */
  static async generate(businessId: string, asOfDate: Date) {
    const tb = await TrialBalanceService.generate(businessId, asOfDate);
    
    // For V1, assuming Fiscal Year starts on the beginning of time or we just run P&L from epoch to asOfDate
    // to get the current year earnings (simplified).
    const epoch = new Date("1970-01-01");
    const pl = await ProfitLossService.generate(businessId, epoch, asOfDate);

    const assetAccounts = tb.accounts.filter(a => a.accountType === "ASSET");
    const liabilityAccounts = tb.accounts.filter(a => a.accountType === "LIABILITY");
    const equityAccounts = tb.accounts.filter(a => a.accountType === "EQUITY");

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const a of assetAccounts) totalAssets += a.balance;
    for (const a of liabilityAccounts) totalLiabilities += a.balance;
    for (const a of equityAccounts) {
      if (a.accountName.toUpperCase().includes("RETAINED EARNINGS")) {
        // Just track it, but we still add it to total equity
      }
      totalEquity += a.balance;
    }

    // Add Current Year Earnings into Equity
    totalEquity += pl.netProfit;

    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    return {
      assets: {
        total: totalAssets,
        accounts: assetAccounts
      },
      liabilities: {
        total: totalLiabilities,
        accounts: liabilityAccounts
      },
      equity: {
        total: totalEquity,
        accounts: equityAccounts,
        currentYearEarnings: pl.netProfit
      },
      isBalanced
    };
  }
}
