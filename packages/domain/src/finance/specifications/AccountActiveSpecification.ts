import { Account } from '../entities/Account';
import { AccountStatus } from '../value-objects/AccountStatus';

export class AccountActiveSpecification {
  isSatisfiedBy(account: Account): { isValid: boolean; errors: string[] } {
    if (account.status !== AccountStatus.ACTIVE && account.status !== AccountStatus.RESTRICTED) {
      return { isValid: false, errors: [`Account ${account.accountId} is not active (Status: ${account.status})`] };
    }
    return { isValid: true, errors: [] };
  }
}
