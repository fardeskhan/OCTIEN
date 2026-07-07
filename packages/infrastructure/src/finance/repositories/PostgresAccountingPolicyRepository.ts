import { AccountingPolicy } from '../../../domain/src/finance/aggregates/AccountingPolicy';

export class PostgresAccountingPolicyRepository {
  async save(policy: AccountingPolicy): Promise<void> {
    // Upsert Policy configuration ensuring EffectiveFrom / EffectiveTo boundaries don't overlap within the DB constraint layer.
  }

  async findEffectivePolicy(tenantId: string, timestamp: string): Promise<AccountingPolicy> {
    // SELECT * FROM accounting_policies WHERE tenant_id = tenantId AND effective_from <= timestamp AND (effective_to >= timestamp OR effective_to IS NULL)
    throw new Error('Not implemented');
  }
}
