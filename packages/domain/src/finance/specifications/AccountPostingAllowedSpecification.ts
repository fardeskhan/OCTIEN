import { Account } from '../entities/Account';
import { AccountStatus } from '../value-objects/AccountStatus';

export class AccountPostingAllowedSpecification {
  isSatisfiedBy(account: Account): { isValid: boolean; errors: string[] } {
    if (account.status === AccountStatus.DRAFT || account.status === AccountStatus.ARCHIVED || account.status === AccountStatus.FROZEN) {
      return { isValid: false, errors: [`Account ${account.accountId} strictly forbids posting (Status: ${account.status})`] };
    }
    return { isValid: true, errors: [] };
  }
}
