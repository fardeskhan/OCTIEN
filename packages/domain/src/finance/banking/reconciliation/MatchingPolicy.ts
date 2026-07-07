import { BankTransaction } from '../aggregates/BankTransaction';
import { BankStatementLine } from './BankStatementLine';

export class MatchingPolicy {
  public static evaluate(transaction: BankTransaction, line: BankStatementLine): number {
    // Highly simplified logic for v1.0
    if (transaction.amount.value !== line.amount.value) return 0.0;
    
    // Perfect match if amount and date match perfectly
    if (transaction.transactionDate.split('T')[0] === line.statementDate.split('T')[0]) {
      return 1.0;
    }
    
    // High confidence if amounts match but dates are slightly off
    return 0.8;
  }
}
