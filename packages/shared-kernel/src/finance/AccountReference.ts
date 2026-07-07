export class AccountReference {
  constructor(
    public readonly namespace: string,   // e.g. finance.sales
    public readonly symbol: string,      // e.g. SALES_REVENUE_DOMESTIC, GST_OUTPUT
    public readonly version: string,     // The contract version this symbol resolves against
    public readonly description?: string
  ) {}

  equals(other: AccountReference): boolean {
    return this.namespace === other.namespace && 
           this.symbol === other.symbol && 
           this.version === other.version;
  }
}
