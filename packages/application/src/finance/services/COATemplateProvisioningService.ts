import { ChartOfAccounts } from '../../../domain/src/finance/aggregates/ChartOfAccounts';

/**
 * APPLICATION WORKFLOW: COA Provisioning
 * Manages tenant onboarding logic by cloning global templates into tenant-specific structures.
 */
export class COATemplateProvisioningService {
  constructor(
    private readonly coaRepository: any, // PostgresChartOfAccountsRepository
    private readonly outboxPublisher: any
  ) {}

  async provisionTenant(tenantId: string, globalTemplateId: string): Promise<ChartOfAccounts> {
    // 1. Load the immutable Global Template
    // 2. Map and clone `Account` entities, rewriting their identifiers and binding to `tenantId`
    // 3. Construct a new `ChartOfAccounts` root aggregate
    // 4. Persist to repository and publish `ChartOfAccountsProvisioned` domain event via Outbox

    const chart = new ChartOfAccounts(
      `coa-${tenantId}-v1`,
      tenantId,
      'v1.0.0',
      new Date().toISOString()
    );

    await this.coaRepository.save(chart);
    return chart;
  }
}
