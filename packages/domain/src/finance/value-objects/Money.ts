import { Decimal } from 'decimal.js';
import { Currency } from './Currency';

export class Money {
  public readonly amount: Decimal;

  private constructor(amount: string | number | Decimal, public readonly currency: Currency) {
    // Configure Decimal to use exact arithmetic and standard accounting rounding (half-even)
    Decimal.set({ rounding: Decimal.ROUND_HALF_EVEN });
    this.amount = new Decimal(amount);
  }

  public static create(amount: string | number, currencyCode: string): Money {
    return new Money(amount, Currency.create(currencyCode));
  }

  public add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount.plus(other.amount), this.currency);
  }

  public subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount.minus(other.amount), this.currency);
  }

  public multiply(multiplier: number | string | Decimal): Money {
    return new Money(this.amount.times(multiplier), this.currency);
  }

  public equals(other: Money): boolean {
    if (!this.currency.equals(other.currency)) return false;
    return this.amount.equals(other.amount);
  }

  public isZero(): boolean {
    return this.amount.isZero();
  }

  public isNegative(): boolean {
    return this.amount.isNegative();
  }

  public isPositive(): boolean {
    return this.amount.isPositive();
  }

  private ensureSameCurrency(other: Money): void {
    if (!this.currency.equals(other.currency)) {
      throw new Error(`Currency mismatch: Cannot operate on ${this.currency.code} and ${other.currency.code}`);
    }
  }

  public toJSON() {
    return {
      amount: this.amount.toString(),
      currency: this.currency.code
    };
  }
}
