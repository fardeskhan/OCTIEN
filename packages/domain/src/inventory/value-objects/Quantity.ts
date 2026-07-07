import { UnitOfMeasure } from './UnitOfMeasure';
import { InvalidUnitException } from '../exceptions/InvalidUnitException';

export class Quantity {
  private constructor(
    public readonly amount: string, // Precision-safe decimal string
    public readonly unit: UnitOfMeasure
  ) {}

  public static create(amount: string, unit: UnitOfMeasure): Quantity {
    if (isNaN(Number(amount))) {
      throw new Error(`Invalid quantity amount: ${amount}`);
    }
    if (Number(amount) < 0) {
      throw new Error("Quantity amount cannot be negative");
    }
    return new Quantity(amount, unit);
  }

  public static zero(unit: UnitOfMeasure): Quantity {
    return new Quantity('0', unit);
  }

  public add(other: Quantity): Quantity {
    if (!this.unit.equals(other.unit)) {
      throw new InvalidUnitException(`Cannot add quantities with different units`);
    }
    const result = Number(this.amount) + Number(other.amount);
    return new Quantity(result.toString(), this.unit);
  }

  public subtract(other: Quantity): Quantity {
    if (!this.unit.equals(other.unit)) {
      throw new InvalidUnitException(`Cannot subtract quantities with different units`);
    }
    const result = Number(this.amount) - Number(other.amount);
    if (result < 0) {
      throw new Error('Subtraction would result in negative quantity');
    }
    return new Quantity(result.toString(), this.unit);
  }

  public isGreaterThanOrEqual(other: Quantity): boolean {
    if (!this.unit.equals(other.unit)) {
      throw new InvalidUnitException(`Cannot compare quantities with different units`);
    }
    return Number(this.amount) >= Number(other.amount);
  }

  public equals(other: Quantity): boolean {
    return this.amount === other.amount && this.unit.equals(other.unit);
  }
}
