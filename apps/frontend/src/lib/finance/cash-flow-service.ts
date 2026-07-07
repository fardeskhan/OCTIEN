import { ProfitLossService } from "./profit-loss-service";
import { BalanceSheetService } from "./balance-sheet-service";
import { TrialBalanceService } from "./trial-balance-service";

export class CashFlowService {
  /**
   * Generates a simplified Indirect Cash Flow Statement for V1.
   * Relies on the fact that Net Change in Cash = Net Profit + Changes in Working Capital.
   */
  static async generate(businessId: string, startDate: Date, endDate: Date) {
    const pl = await ProfitLossService.generate(businessId, startDate, endDate);
    
    // In V1, since we don't strictly have a start-of-period Trial Balance snapshot in our model to compare easily 
    // (we'd have to generate TB at startDate and TB at endDate and diff them),
    // we'll simulate the working capital changes if possible, or just generate the required TBs.
    
    const tbStart = await TrialBalanceService.generate(businessId, startDate);
    const tbEnd = await TrialBalanceService.generate(businessId, endDate);

    let arChange = 0; // Increase in AR is a cash outflow (-)
    let apChange = 0; // Increase in AP is a cash inflow (+)
    let inventoryChange = 0;

    for (const endAcc of tbEnd.accounts) {
      const startAcc = tbStart.accounts.find(a => a.accountId === endAcc.accountId);
      const startBal = startAcc ? startAcc.balance : 0;
      const diff = endAcc.balance - startBal;

      // Simplistic V1 heuristic for working capital accounts
      const name = endAcc.accountName.toUpperCase();
      if (name.includes("RECEIVABLE")) {
        arChange -= diff; // Increase in AR = less cash
      } else if (name.includes("PAYABLE")) {
        apChange += diff; // Increase in AP = more cash
      } else if (name.includes("INVENTORY") || name.includes("STOCK")) {
        inventoryChange -= diff;
      }
    }

    const operatingCashFlow = pl.netProfit + arChange + apChange + inventoryChange;

    return {
      netProfit: pl.netProfit,
      adjustments: {
        accountsReceivable: arChange,
        accountsPayable: apChange,
        inventory: inventoryChange
      },
      operatingCashFlow
    };
  }
}
