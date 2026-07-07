import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { TaxResult } from './TaxResult';
import { TaxRule } from '../aggregates/TaxRule';

export class TaxDeterminationService {
  
  public calculateTax(
    taxableAmount: Decimal,
    transactionDate: string,
    rules: TaxRule[] // Mocking a repository lookup
  ): TaxResult {

    // Filter rules valid for transactionDate
    const txDate = new Date(transactionDate).getTime();
    const validRules = rules.filter(r => {
      const from = new Date(r.effectiveFrom).getTime();
      const to = r.effectiveTo ? new Date(r.effectiveTo).getTime() : Infinity;
      return txDate >= from && txDate <= to;
    });

    if (validRules.length === 0) {
      throw new Error(`No valid tax rules found for transactionDate: ${transactionDate}`);
    }

    // Assuming we pick the first valid rule for simplicity in this domain mock
    const rule = validRules[0];
    
    let totalTax = 0;
    const taxLines = [];

    const amountFloat = parseFloat(taxableAmount.value);

    for (const rate of rule.rates) {
      const rateFloat = parseFloat(rate.rate.value);
      const taxAmount = (amountFloat * rateFloat) / 100;
      
      totalTax += taxAmount;
      
      taxLines.push({
        taxLineId: `line-${Date.now()}-${Math.random()}`,
        taxType: rate.taxType,
        rate: rate.rate,
        taxableAmount,
        taxAmount: new Decimal(taxAmount.toString(), 2, 38)
      });
    }

    return new TaxResult(
      rule.jurisdictionId,
      rule.taxCodeId,
      taxableAmount,
      new Decimal(totalTax.toString(), 2, 38),
      taxLines
    );
  }
}
