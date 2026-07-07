import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';

export class WriteOffDocument {
  constructor(
    public readonly writeOffId: string,
    public readonly tenantId: string,
    public readonly invoiceId: string,
    public readonly amount: Decimal,
    public readonly currency: Currency,
    public readonly reason: string,
    public readonly approvedBy: string,
    public readonly writeOffDate: string,
    public readonly isReversal: boolean = false,
    public readonly originalWriteOffId?: string
  ) {}

  public reverse(reversalId: string, reversedBy: string): WriteOffDocument {
    if (this.isReversal) {
      throw new Error('Cannot reverse an already reversed write-off.');
    }

    return new WriteOffDocument(
      reversalId,
      this.tenantId,
      this.invoiceId,
      this.amount,
      this.currency,
      `REVERSAL: ${this.reason}`,
      reversedBy,
      new Date().toISOString(),
      true,
      this.writeOffId
    );
  }
}
