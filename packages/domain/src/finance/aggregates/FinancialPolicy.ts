export interface ToleranceLimits {
  roundingPrecision: number;
  materialityThreshold: number;
}

/**
 * Domain Aggregate: Financial Policy
 * Sits hierarchically above Posting Profiles. Controls global accounting parameters per tenant.
 */
export class FinancialPolicy {
  constructor(
    public readonly policyId: string,
    public readonly tenantId: string,
    public readonly accountingStandard: string, // e.g. 'IFRS', 'US_GAAP'
    public readonly fiscalCalendarId: string,
    public readonly fxPolicy: any,
    public readonly toleranceLimits: ToleranceLimits,
    public readonly journalNumberingStrategy: string,
    public readonly periodLockingStrategy: string
  ) {}
}
