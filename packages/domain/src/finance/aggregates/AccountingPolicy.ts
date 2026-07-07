export enum PolicyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED' // Replaced by newer version
}

export class AccountingPolicy {
  constructor(
    public readonly policyId: string,
    public readonly tenantId: string,
    public readonly version: string,
    public readonly standard: string, // E.g., 'IFRS', 'GAAP'
    public readonly effectiveFrom: string, // ISO-8601 UTC
    public readonly effectiveTo: string | null,
    public readonly currencyPolicy: any, // Wraps kernel configuration
    public readonly roundingPolicy: any, // Wraps kernel configuration
    public readonly dimensionPolicy: any, 
    public status: PolicyStatus = PolicyStatus.DRAFT
  ) {}

  public activate(): void {
    if (this.status !== PolicyStatus.DRAFT) {
      throw new Error(`Policy ${this.policyId} cannot be activated from state ${this.status}`);
    }
    this.status = PolicyStatus.ACTIVE;
  }

  public archive(replacementEffectiveDate: string): AccountingPolicy {
    if (this.status !== PolicyStatus.ACTIVE) {
      throw new Error('Only active policies can be archived by replacement');
    }
    this.status = PolicyStatus.ARCHIVED;
    return new AccountingPolicy(
      this.policyId,
      this.tenantId,
      this.version, // Should be incremented by the domain service calling this
      this.standard,
      this.effectiveFrom,
      replacementEffectiveDate,
      this.currencyPolicy,
      this.roundingPolicy,
      this.dimensionPolicy,
      PolicyStatus.ARCHIVED
    );
  }
}
