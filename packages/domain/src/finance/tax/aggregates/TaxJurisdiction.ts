export class TaxJurisdiction {
  constructor(
    public readonly jurisdictionId: string,
    public readonly tenantId: string,
    public readonly code: string,
    public readonly country: string,
    public readonly state: string,
    public readonly status: 'ACTIVE' | 'INACTIVE'
  ) {}
}
