export class ExchangeRateReference {
  constructor(
    public readonly id: string,
    public readonly provider: string,
    public readonly type: string, // e.g. 'SPOT', 'AVERAGE'
    public readonly effectiveAt: string, // ISO-8601 UTC
    public readonly version: string
  ) {}

  equals(other: ExchangeRateReference): boolean {
    return this.id === other.id && this.version === other.version;
  }
}
