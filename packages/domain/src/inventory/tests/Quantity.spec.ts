import { Quantity } from '../value-objects/Quantity';
import { UnitOfMeasure } from '../value-objects/UnitOfMeasure';
import { InvalidUnitException } from '../exceptions/InvalidUnitException';
import { describe, it, expect } from 'vitest';

describe('Quantity Value Object', () => {
  it('should create a valid quantity with unit', () => {
    const liters = UnitOfMeasure.create('LITERS');
    const q = Quantity.create(500, liters);
    expect(q.value).toBe(500);
    expect(q.unit.value).toBe('LITERS');
  });

  it('should throw on invalid numbers', () => {
    const liters = UnitOfMeasure.create('LITERS');
    expect(() => Quantity.create(NaN, liters)).toThrow();
    expect(() => Quantity.create(Infinity, liters)).toThrow();
  });

  it('should add quantities with the same unit', () => {
    const liters = UnitOfMeasure.create('LITERS');
    const q1 = Quantity.create(500, liters);
    const q2 = Quantity.create(200, liters);
    const result = q1.add(q2);
    expect(result.value).toBe(700);
  });

  it('should throw when adding different units', () => {
    const liters = UnitOfMeasure.create('LITERS');
    const kg = UnitOfMeasure.create('KILOGRAMS');
    const q1 = Quantity.create(500, liters);
    const q2 = Quantity.create(200, kg);
    expect(() => q1.add(q2)).toThrow(InvalidUnitException);
  });

  it('should subtract quantities', () => {
    const kg = UnitOfMeasure.create('KILOGRAMS');
    const q1 = Quantity.create(50, kg);
    const q2 = Quantity.create(10, kg);
    expect(q1.subtract(q2).value).toBe(40);
  });
});
