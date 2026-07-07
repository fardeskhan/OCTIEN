import { Decimal } from './Decimal';
import { Currency } from './Currency';

/**
 * Pure Dependency-Free Financial Kernel: Money
 * Provides deterministic operations and allocation without exposing mutable state.
 */
export class Money {
  constructor(
    public readonly amount: Decimal,
    public readonly currency: Currency
  ) {}

  plus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.add(other.amount), this.currency);
  }

  minus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.subtract(other.amount), this.currency);
  }

  negate(): Money {
    return new Money(this.amount.multiply(-1), this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount.multiply(factor), this.currency);
  }

  allocate(ratios: number[]): Money[] {
    const total = ratios.reduce((sum, r) => sum + r, 0);
    if (total === 0) throw new Error('Cannot allocate with zero total ratio');

    let remainder = Number(this.amount.value);
    const results: Money[] = [];

    for (let i = 0; i < ratios.length; i++) {
      const share = i === ratios.length - 1 
        ? remainder 
        : (Number(this.amount.value) * ratios[i]) / total;
      
      const strShare = share.toFixed(this.amount.scale);
      results.push(new Money(new Decimal(strShare, this.amount.scale, this.amount.precision), this.currency));
      remainder -= Number(strShare);
    }
    
    return results;
  }

  compare(other: Money): number {
    this.assertSameCurrency(other);
    return this.amount.compare(other.amount);
  }

  static zero(currency: Currency): Money {
    return new Money(new Decimal('0', currency.precision, currency.precision), currency);
  }

  private assertSameCurrency(other: Money): void {
    if (!this.currency.equals(other.currency)) {
      throw new Error(`Currency mismatch: ${this.currency.code} !== ${other.currency.code}`);
    }
  }
}
