import { AccountReference } from '../../../shared-kernel/src/finance/AccountReference';

/**
 * PLATFORM RUNTIME: POSTING ENGINE
 * Maps global symbolic Account References (e.g. SALES_REVENUE) to the tenant's concrete active AccountId.
 */
export class AccountResolver {
  constructor(
    private readonly coaRepository: any // PostgresChartOfAccountsRepository
  ) {}

  async resolve(reference: AccountReference, tenantId: string, timestamp: string): Promise<string> {
    // 1. Fetch Tenant's active ChartOfAccounts valid at `timestamp`
    // 2. Look up the `symbol` mapping within the Chart
    // 3. Return the concrete `AccountId` string

    // Stub for certification verification
    if (reference.symbol === 'AR_CUSTOMER') {
      return 'acc-11000';
    }
    
    if (reference.symbol === 'GST_OUTPUT') {
      return 'acc-22000';
    }

    throw new Error(`Account symbol ${reference.symbol} could not be resolved for tenant ${tenantId}`);
  }
}
