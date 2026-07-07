export class Money {
  constructor(
    public readonly amount: number,
    public readonly currencyCode: string,
    public readonly exchangeRateReference?: string,
    public readonly valuationDate?: Date
  ) {
    if (amount < 0) throw new Error("Money cannot be negative in this context");
    if (!currencyCode || currencyCode.length !== 3) throw new Error("Invalid currency code");
  }

  public add(other: Money): Money {
    if (this.currencyCode !== other.currencyCode) {
      throw new Error("Cannot add money with different currencies directly");
    }
    return new Money(
      this.amount + other.amount,
      this.currencyCode,
      this.exchangeRateReference,
      this.valuationDate
    );
  }
}
