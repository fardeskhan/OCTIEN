import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';

export enum AccountStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Frozen = 'FROZEN'
}

export class BankAccount extends AggregateRoot<string> {
  private _tenantId: TenantId;
  private _connectionId: string;
  private _accountNumberMasked: string;
  private _currency: string;
  private _currentBalance: number;
  private _status: AccountStatus;

  private constructor(
    id: string,
    tenantId: TenantId,
    connectionId: string,
    accountNumberMasked: string,
    currency: string,
    currentBalance: number,
    status: AccountStatus
  ) {
    super(id);
    this._tenantId = tenantId;
    this._connectionId = connectionId;
    this._accountNumberMasked = accountNumberMasked;
    this._currency = currency;
    this._currentBalance = currentBalance;
    this._status = status;
  }

  public static discover(
    id: string,
    tenantId: TenantId,
    connectionId: string,
    accountNumberMasked: string,
    currency: string
  ): BankAccount {
    return new BankAccount(id, tenantId, connectionId, accountNumberMasked, currency, 0, AccountStatus.Active);
  }

  public updateBalance(newBalance: number): void {
    this._currentBalance = newBalance;
    // this.addDomainEvent(new BalanceUpdatedEvent(this.id, newBalance));
  }

  get tenantId(): TenantId { return this._tenantId; }
  get connectionId(): string { return this._connectionId; }
  get accountNumberMasked(): string { return this._accountNumberMasked; }
  get currency(): string { return this._currency; }
  get currentBalance(): number { return this._currentBalance; }
  get status(): AccountStatus { return this._status; }
}
