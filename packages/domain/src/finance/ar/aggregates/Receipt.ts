import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';

export enum ReceiptStatus {
  DRAFT = 'DRAFT',
  APPLIED = 'APPLIED',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED'
}

export class Receipt {
  private _status: ReceiptStatus = ReceiptStatus.DRAFT;

  constructor(
    public readonly receiptId: string,
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly originalAmount: Decimal,
    public readonly currency: Currency,
    public readonly receiptDate: string,
    public readonly idempotencyKey: string // Prevents duplicate application of same payload
  ) {}

  get status(): ReceiptStatus {
    return this._status;
  }

  public applyFunds(): void {
    if (this._status !== ReceiptStatus.DRAFT) throw new Error('Only DRAFT receipts can be APPLIED');
    this._status = ReceiptStatus.APPLIED;
  }

  public post(): void {
    if (this._status !== ReceiptStatus.APPLIED) throw new Error('Only APPLIED receipts can be POSTED');
    this._status = ReceiptStatus.POSTED;
  }

  public reverse(): void {
    if (this._status !== ReceiptStatus.POSTED) throw new Error('Only POSTED receipts can be REVERSED');
    this._status = ReceiptStatus.REVERSED;
  }
}
