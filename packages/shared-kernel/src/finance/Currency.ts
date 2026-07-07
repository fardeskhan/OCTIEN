/**
 * Pure Dependency-Free Financial Kernel: Currency
 */
export class Currency {
  constructor(
    public readonly code: string,
    public readonly precision: number,
    public readonly minorUnit: string,
    public readonly roundingMode: 'HALF_EVEN' | 'HALF_UP' | 'UP' | 'DOWN',
    public readonly symbol: string,
    public readonly isZeroDecimal: boolean
  ) {
    if (code.length !== 3) {
      throw new Error('Currency code must be standard 3 letters (e.g. INR)');
    }
  }

  equals(other: Currency): boolean {
    return this.code === other.code;
  }
}
