import { Currency } from '../../../../shared-kernel/src/finance/Currency';
import { BankAccountFrozenException } from '../exceptions/BankAccountFrozenException';
import { BankAccountClosedException } from '../exceptions/BankAccountClosedException';

export enum BankAccountStatus {
  OPEN = 'OPEN',
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED'
}

export class BankAccount {
  constructor(
    public readonly bankAccountId: string,
    public readonly tenantId: string,
    public readonly currency: Currency,
    private _status: BankAccountStatus
  ) {}

  get status(): BankAccountStatus {
    return this._status;
  }

  public activate(): void {
    if (this._status === BankAccountStatus.CLOSED) {
      throw new Error('Cannot activate a closed account.');
    }
    this._status = BankAccountStatus.ACTIVE;
  }

  public freeze(): void {
    if (this._status === BankAccountStatus.CLOSED) {
      throw new Error('Cannot freeze a closed account.');
    }
    this._status = BankAccountStatus.FROZEN;
  }

  public close(): void {
    this._status = BankAccountStatus.CLOSED;
  }

  public assertTransactable(): void {
    if (this._status === BankAccountStatus.FROZEN) {
      throw new BankAccountFrozenException(this.bankAccountId);
    }
    if (this._status === BankAccountStatus.CLOSED) {
      throw new BankAccountClosedException(this.bankAccountId);
    }
  }

  // Notice: No balance, availableBalance, or runningBalance stored here.
}
