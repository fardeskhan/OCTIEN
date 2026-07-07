import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';

export class MoneyConfiguration extends AggregateRoot<string> {
  private constructor(
    id: string,
    public readonly businessId: string,
    public baseCurrency: string,
    public decimalPrecision: number,
    public roundingMode: 'ROUND_HALF_EVEN' | 'ROUND_HALF_UP' | 'ROUND_DOWN',
    public exchangeRateProvider: string | null,
    public exchangeRatePolicy: 'DAILY' | 'REAL_TIME' | 'MANUAL'
  ) {
    super(id);
  }

  public static create(
    id: string,
    businessId: string,
    baseCurrency: string
  ): MoneyConfiguration {
    return new MoneyConfiguration(
      id,
      businessId,
      baseCurrency,
      2,
      'ROUND_HALF_EVEN',
      null,
      'MANUAL'
    );
  }

  public updatePolicy(
    precision: number,
    rounding: 'ROUND_HALF_EVEN' | 'ROUND_HALF_UP' | 'ROUND_DOWN',
    policy: 'DAILY' | 'REAL_TIME' | 'MANUAL'
  ): void {
    this.decimalPrecision = precision;
    this.roundingMode = rounding;
    this.exchangeRatePolicy = policy;
  }
}
