import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  WRITTEN_OFF = 'WRITTEN_OFF',
  CANCELLED = 'CANCELLED'
}

export class ReceivableInvoice {
  private _status: InvoiceStatus = InvoiceStatus.DRAFT;

  constructor(
    public readonly invoiceId: string,
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly originalAmount: Decimal,
    public readonly currency: Currency,
    public readonly invoiceDate: string,
    public readonly dueDate: string
  ) {}

  get status(): InvoiceStatus {
    return this._status;
  }

  public approve(): void {
    if (this._status !== InvoiceStatus.DRAFT) throw new Error('Only DRAFT invoices can be approved');
    this._status = InvoiceStatus.APPROVED;
  }

  public post(): void {
    if (this._status !== InvoiceStatus.APPROVED) throw new Error('Only APPROVED invoices can be posted');
    this._status = InvoiceStatus.POSTED;
  }

  public markPartiallyPaid(): void {
    this._status = InvoiceStatus.PARTIALLY_PAID;
  }

  public markPaid(): void {
    this._status = InvoiceStatus.PAID;
  }
  
  public markWrittenOff(): void {
    this._status = InvoiceStatus.WRITTEN_OFF;
  }

  public cancel(): void {
    if (this._status !== InvoiceStatus.DRAFT && this._status !== InvoiceStatus.APPROVED) {
      throw new Error('Cannot cancel an invoice after it has been POSTED');
    }
    this._status = InvoiceStatus.CANCELLED;
  }

  // NOTE: Explicitly DOES NOT store `balance` or `remaining`.
  // Derivation is left to InvoiceAllocation chains and Projections.
}
