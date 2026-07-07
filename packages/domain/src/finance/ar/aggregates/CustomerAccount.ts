import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';

export enum CustomerCreditStatus {
  ACTIVE = 'ACTIVE',
  HOLD = 'HOLD',
  SUSPENDED = 'SUSPENDED'
}

export class CustomerAccount {
  constructor(
    public readonly customerId: string,
    public readonly tenantId: string,
    public readonly creditLimit: Decimal,
    public readonly paymentTerms: string,
    private _creditStatus: CustomerCreditStatus
  ) {}

  get creditStatus(): CustomerCreditStatus {
    return this._creditStatus;
  }

  public placeOnHold(): void {
    this._creditStatus = CustomerCreditStatus.HOLD;
  }

  public activate(): void {
    this._creditStatus = CustomerCreditStatus.ACTIVE;
  }

  // NOTE: Explicitly does NOT store mutable outstanding balance.
  // Validation against credit limit will rely on querying the OpenInvoicesProjection + CreditExposureProjection.
}
