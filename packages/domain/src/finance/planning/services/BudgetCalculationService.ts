import { BudgetLine } from '../aggregates/BudgetLine';
import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export class BudgetCalculationService {
  
  public rollupLines(lines: BudgetLine[]): Decimal {
    let total = new Decimal('0', 2, 38);
    for (const line of lines) {
      const val = parseFloat(total.value) + parseFloat(line.amount.value);
      total = new Decimal(val.toString(), 2, 38);
    }
    return total;
  }

  public calculateVariance(budget: Decimal, actual: Decimal): { variance: Decimal, variancePercentage: string } {
    const budgetFloat = parseFloat(budget.value);
    const actualFloat = parseFloat(actual.value);
    const varianceFloat = actualFloat - budgetFloat;

    let variancePercentage = '0%';
    if (budgetFloat !== 0) {
      const pct = (varianceFloat / budgetFloat) * 100;
      variancePercentage = `${pct.toFixed(2)}%`;
    }

    return {
      variance: new Decimal(varianceFloat.toString(), 2, 38),
      variancePercentage
    };
  }

  public compareVersions(v1Total: Decimal, v2Total: Decimal): { changeAmount: Decimal, changePercentage: string } {
    const v1Float = parseFloat(v1Total.value);
    const v2Float = parseFloat(v2Total.value);
    const change = v2Float - v1Float;

    let changePercentage = '0%';
    if (v1Float !== 0) {
      const pct = (change / v1Float) * 100;
      changePercentage = `${pct.toFixed(2)}%`;
    }

    return {
      changeAmount: new Decimal(change.toString(), 2, 38),
      changePercentage
    };
  }
}
