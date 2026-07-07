import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';
import { CrossCurrencyPaymentAllocationNotSupportedException } from '../exceptions/CrossCurrencyPaymentAllocationNotSupportedException';
import { OverAllocationException } from '../exceptions/OverAllocationException';

export class PaymentAllocation {
  constructor(
    public readonly allocationId: string,
    public readonly tenantId: string,
    public readonly invoiceId: string,
    public readonly sourceId: string, // PaymentId or DebitNoteId
    public readonly sourceType: 'PAYMENT' | 'DEBIT_NOTE',
    public readonly allocatedAmount: Decimal,
    public readonly currency: Currency,
    public readonly allocationTimestamp: string,
    public readonly allocationSequence: number,
    public readonly isReversal: boolean = false,
    public readonly originalAllocationId?: string
  ) {}

  public static allocate(
    allocationId: string,
    tenantId: string,
    invoiceId: string,
    invoiceCurrency: Currency,
    sourceId: string,
    sourceType: 'PAYMENT' | 'DEBIT_NOTE',
    sourceCurrency: Currency,
    allocatedAmount: Decimal,
    allocationSequence: number,
    invoiceRemainingBalance: Decimal
  ): PaymentAllocation {
    
    if (invoiceCurrency.code !== sourceCurrency.code) {
      throw new CrossCurrencyPaymentAllocationNotSupportedException(sourceCurrency.code, invoiceCurrency.code);
    }

    if (allocatedAmount.compare(invoiceRemainingBalance) > 0) {
      throw new OverAllocationException(allocatedAmount.value, invoiceRemainingBalance.value);
    }

    return new PaymentAllocation(
      allocationId,
      tenantId,
      invoiceId,
      sourceId,
      sourceType,
      allocatedAmount,
      invoiceCurrency,
      new Date().toISOString(),
      allocationSequence
    );
  }

  public reverse(reversalId: string, reversalSequence: number): PaymentAllocation {
    if (this.isReversal) {
      throw new Error('Cannot reverse an already reversed allocation.');
    }

    return new PaymentAllocation(
      reversalId,
      this.tenantId,
      this.invoiceId,
      this.sourceId,
      this.sourceType,
      this.allocatedAmount,
      this.currency,
      new Date().toISOString(),
      reversalSequence,
      true,
      this.allocationId
    );
  }
}
