import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';
import { BankTransactionType } from '../events/BankingEvents';

export class BankTransaction {
  constructor(
    public readonly transactionId: string,
    public readonly tenantId: string,
    public readonly bankAccountId: string,
    public readonly type: BankTransactionType,
    public readonly amount: Decimal,
    public readonly currency: Currency,
    public readonly transactionDate: string,
    public readonly isReversal: boolean = false,
    public readonly originalTransactionId?: string
  ) {}

  // A BankTransaction is immutable. Once posted, it can only be reversed.
  public reverse(reversalId: string): BankTransaction {
    if (this.isReversal) {
      throw new Error('Cannot reverse an already reversed transaction.');
    }

    return new BankTransaction(
      reversalId,
      this.tenantId,
      this.bankAccountId,
      this.type,
      this.amount, // Amounts are typically absolute, credit/debit is implied by type and context
      this.currency,
      new Date().toISOString(),
      true,
      this.transactionId
    );
  }
}
