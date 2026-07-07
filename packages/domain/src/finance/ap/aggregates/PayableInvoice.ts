import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';

export enum PayableInvoiceStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  WRITTEN_OFF = 'WRITTEN_OFF',
  CANCELLED = 'CANCELLED'
}

export class PayableInvoice {
  private _status: PayableInvoiceStatus = PayableInvoiceStatus.DRAFT;

  constructor(
    public readonly invoiceId: string,
    public readonly tenantId: string,
    public readonly vendorId: string,
    public readonly originalAmount: Decimal,
    public readonly currency: Currency,
    public readonly invoiceDate: string,
    public readonly dueDate: string
  ) {}

  get status(): PayableInvoiceStatus {
    return this._status;
  }

  public approve(): void {
    if (this._status !== PayableInvoiceStatus.DRAFT) throw new Error('Only DRAFT invoices can be approved');
    this._status = PayableInvoiceStatus.APPROVED;
  }

  public post(): void {
    if (this._status !== PayableInvoiceStatus.APPROVED) throw new Error('Only APPROVED invoices can be posted');
    this._status = PayableInvoiceStatus.POSTED;
  }

  public markPartiallyPaid(): void {
    this._status = PayableInvoiceStatus.PARTIALLY_PAID;
  }

  public markPaid(): void {
    this._status = PayableInvoiceStatus.PAID;
  }
  
  public markWrittenOff(): void {
    this._status = PayableInvoiceStatus.WRITTEN_OFF;
  }

  public cancel(): void {
    if (this._status !== PayableInvoiceStatus.DRAFT && this._status !== PayableInvoiceStatus.APPROVED) {
      throw new Error('Cannot cancel an invoice after it has been POSTED');
    }
    this._status = PayableInvoiceStatus.CANCELLED;
  }
}
