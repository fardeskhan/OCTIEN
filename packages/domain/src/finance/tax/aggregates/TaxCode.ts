export class TaxCode {
  constructor(
    public readonly taxCodeId: string,
    public readonly tenantId: string,
    public readonly code: string, // e.g. GST18
    public readonly description: string,
    public readonly taxCategory: string
  ) {}
}
