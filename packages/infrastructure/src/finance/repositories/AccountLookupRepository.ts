import { AccountReference } from '../../../../shared-kernel/src/finance/AccountReference';

/**
 * INFRASTRUCTURE: Persistence Layer
 * Explicitly separated read-model interface preventing the orchestration engine from loading massive Aggregate Roots.
 */
export interface AccountLookupRepository {
  resolve(reference: AccountReference, tenantId: string, postingDate: string): Promise<string>;
}
