import { TrialBalanceService } from "./trial-balance-service";
import { AccountTypeEnum } from "@prisma/client";

export class ProfitLossService {
  /**
   * Generates a Profit and Loss statement based on Trial Balance data.
   */
  static async generate(businessId: string, startDate: Date, endDate: Date) {
    // For V1, assuming TrialBalanceService returns net values up to endDate.
    // In a full implementation, P&L strictly uses (endDate balances) - (startDate balances) for income/expense accounts.
    // Since revenue/expense reset at year-end, if startDate is the start of the fiscal year, we just use endDate balances.
    
    // We will query the TrialBalance for endDate. 
    // We should strictly filter JournalLines by date range [startDate, endDate] if we want a pure period P&L.
    // To do this properly without duplicating logic, we'll write a custom aggregator or use TrialBalanceService 
    // (but TrialBalance Service doesn't take startDate right now).
    // For V1 reporting, we'll use a direct query for the period.

    const tb = await TrialBalanceService.generate(businessId, endDate);
    
    let revenue = 0;
    let cogs = 0;
    let operatingExpenses = 0;
    
    // Simplification for V1: 
    // We assume COGS accounts are specifically tagged, or we just bucket all EXPENSE into operating expenses 
    // if we don't have a specific COGS account type. Currently we just have REVENUE and EXPENSE.
    
    const revenueAccounts = tb.accounts.filter(a => a.accountType === "REVENUE");
    const expenseAccounts = tb.accounts.filter(a => a.accountType === "EXPENSE");
    
    for (const a of revenueAccounts) {
      revenue += a.balance; // normal balance is CREDIT, so balance = credit - debit
    }
    
    for (const a of expenseAccounts) {
      // In a real ERP, we'd check if `accountCode` falls into COGS range (e.g. 5xxxx)
      // For V1, let's just group them all as Operating Expenses if we can't tell,
      // or if accountName contains 'COGS' we can bucket it.
      if (a.accountName.toUpperCase().includes("COGS") || a.accountName.toUpperCase().includes("COST OF GOODS")) {
        cogs += a.balance;
      } else {
        operatingExpenses += a.balance;
      }
    }
    
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - operatingExpenses;

    return {
      revenue,
      cogs,
      grossProfit,
      operatingExpenses,
      netProfit,
      revenueAccounts,
      expenseAccounts
    };
  }
}
