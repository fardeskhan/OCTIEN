import { AccountingPolicy } from '../../../domain/src/finance/aggregates/AccountingPolicy';

/**
 * PLATFORM RUNTIME: POSTING ENGINE
 * Maps posting dates and tenant contexts to historical Accounting Policies.
 */
export class AccountingPolicyResolver {
  constructor(
    private readonly policyRepository: any // PostgresAccountingPolicyRepository
  ) {}

  async resolve(tenantId: string, postingDate: string): Promise<AccountingPolicy> {
    // Looks up historical configuration boundaries.
    // 1. Posting Date -> Tenant -> Effective Version
    return this.policyRepository.findEffectivePolicy(tenantId, postingDate);
  }
}
