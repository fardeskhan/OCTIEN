import DecimalJs from 'decimal.js';
import { PrecisionOverflowException } from './FinancialException';

/**
 * Pure Dependency-Free Financial Kernel: Decimal
 * Wraps audited `decimal.js` arithmetic. Prohibits IEEE 754 float rounding errors.
 */
export class Decimal {
  private static readonly MAX_PRECISION = 38;
  private static readonly MAX_SCALE = 18;
  
  private readonly internal: DecimalJs;

  constructor(
    public readonly value: string,
    public readonly scale: number,
    public readonly precision: number
  ) {
    try {
      this.internal = new DecimalJs(value);
    } catch {
      throw new Error(`Invalid Decimal value: ${value}`);
    }
    
    if (scale > Decimal.MAX_SCALE || precision > Decimal.MAX_PRECISION) {
      throw new PrecisionOverflowException(value, Decimal.MAX_SCALE);
    }
  }

  equals(other: Decimal): boolean {
    return this.internal.equals(other.internal) && 
           this.scale === other.scale && 
           this.precision === other.precision;
  }

  add(other: Decimal): Decimal {
    const numValue = this.internal.plus(other.internal).toFixed(this.scale);
    return new Decimal(numValue, this.scale, this.precision);
  }

  subtract(other: Decimal): Decimal {
    const numValue = this.internal.minus(other.internal).toFixed(this.scale);
    return new Decimal(numValue, this.scale, this.precision);
  }

  multiply(factor: number): Decimal {
    const numValue = this.internal.times(factor).toFixed(this.scale);
    return new Decimal(numValue, this.scale, this.precision);
  }

  divide(divisor: number): Decimal {
    if (divisor === 0) throw new Error('Division by zero');
    const numValue = this.internal.dividedBy(divisor).toFixed(this.scale);
    return new Decimal(numValue, this.scale, this.precision);
  }

  compare(other: Decimal): number {
    return this.internal.comparedTo(other.internal);
  }

  round(): Decimal {
    const rounded = this.internal.toDecimalPlaces(this.scale, DecimalJs.ROUND_HALF_EVEN).toFixed(this.scale);
    return new Decimal(rounded, this.scale, this.precision);
  }

  isZero(): boolean {
    return this.internal.isZero();
  }
}
