import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';
import { CrossCurrencyAllocationNotSupportedException } from '../exceptions/CrossCurrencyAllocationNotSupportedException';

export class InvoiceAllocation {
  constructor(
    public readonly allocationId: string,
    public readonly tenantId: string,
    public readonly invoiceId: string,
    public readonly sourceId: string, // ReceiptId or CreditNoteId
    public readonly sourceType: 'RECEIPT' | 'CREDIT_NOTE',
    public readonly allocatedAmount: Decimal,
    public readonly currency: Currency,
    public readonly allocationTimestamp: string,
    public readonly allocationSequence: number,
    public readonly isReversal: boolean = false,
    public readonly originalAllocationId?: string // Link to reversed allocation
  ) {}

  public static allocate(
    allocationId: string,
    tenantId: string,
    invoiceId: string,
    invoiceCurrency: Currency,
    sourceId: string,
    sourceType: 'RECEIPT' | 'CREDIT_NOTE',
    sourceCurrency: Currency,
    allocatedAmount: Decimal,
    allocationSequence: number
  ): InvoiceAllocation {
    
    // Strict requirement: Single Currency Allocation
    if (invoiceCurrency.code !== sourceCurrency.code) {
      throw new CrossCurrencyAllocationNotSupportedException(sourceCurrency.code, invoiceCurrency.code);
    }

    return new InvoiceAllocation(
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

  public reverse(reversalId: string, reversalSequence: number): InvoiceAllocation {
    if (this.isReversal) {
      throw new Error('Cannot reverse an already reversed allocation.');
    }

    return new InvoiceAllocation(
      reversalId,
      this.tenantId,
      this.invoiceId,
      this.sourceId,
      this.sourceType,
      this.allocatedAmount, // Remains positive, but flag isReversal mathematically negates it in Projections
      this.currency,
      new Date().toISOString(),
      reversalSequence,
      true,
      this.allocationId
    );
  }
}
