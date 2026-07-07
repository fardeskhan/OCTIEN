import { AccountStatus } from '../value-objects/AccountStatus';
import { AccountType } from '../value-objects/AccountType';
import { NaturalAccount } from '../value-objects/NaturalAccount';
import { PresentationGroup } from '../value-objects/PresentationGroup';

export class Account {
  constructor(
    public readonly accountId: string,
    public readonly tenantId: string,
    public readonly accountNumber: string,
    public readonly accountName: string,
    public readonly accountType: AccountType,
    public readonly naturalAccount: NaturalAccount,
    public readonly presentationGroup: PresentationGroup,
    public status: AccountStatus,
    public readonly currencyPolicy: string, // e.g., 'BASE_ONLY', 'MULTI_CURRENCY'
    public readonly parentAccountId?: string
  ) {}

  public activate(requiresApproval: boolean = false): void {
    if (this.status === AccountStatus.ARCHIVED) {
      throw new Error('ARCHIVED accounts cannot transition to any other state.');
    }
    if (this.status === AccountStatus.FROZEN && !requiresApproval) {
      throw new Error('Transitioning from FROZEN to ACTIVE requires explicit approval.');
    }
    this.status = AccountStatus.ACTIVE;
  }

  public freeze(): void {
    if (this.status === AccountStatus.ARCHIVED) {
      throw new Error('ARCHIVED accounts cannot transition to any other state.');
    }
    this.status = AccountStatus.FROZEN;
  }

  public archive(): void {
    this.status = AccountStatus.ARCHIVED;
  }
}
