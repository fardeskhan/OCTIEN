import { Account } from '../entities/Account';

export class AccountCurrencySpecification {
  isSatisfiedBy(account: Account, postedCurrencyCode: string): { isValid: boolean; errors: string[] } {
    // If account allows BASE_ONLY but postedCurrencyCode is foreign, it rejects the journal.
    if (account.currencyPolicy === 'BASE_ONLY' && postedCurrencyCode !== 'BASE_CODE_STUB') {
      return { isValid: false, errors: [`Account ${account.accountId} does not allow foreign currency postings`] };
    }
    return { isValid: true, errors: [] };
  }
}
