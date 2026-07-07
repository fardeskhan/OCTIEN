import { Journal } from '../aggregates/Journal';
import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';

export class BalancedJournalSpecification {
  isSatisfiedBy(journal: Journal): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Group by Currency to ensure we balance perfectly across all identical currencies.
    // Usually, enterprise journals balance within the primary functional currency.
    const currencyTotals = new Map<string, Decimal>();

    for (const line of journal.lines) {
      const code = line.currency.code;
      const currentBalance = currencyTotals.get(code) || new Decimal('0', 18, 38); // Standard kernel limits
      
      const updatedBalance = line.type === 'DEBIT' 
        ? currentBalance.add(line.amount)
        : currentBalance.subtract(line.amount);
        
      currencyTotals.set(code, updatedBalance);
    }

    for (const [code, balance] of currencyTotals.entries()) {
      // Must equal exactly zero mathematically
      if (!balance.isZero()) {
        errors.push(`Journal is unbalanced by ${balance.value} for currency ${code}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
