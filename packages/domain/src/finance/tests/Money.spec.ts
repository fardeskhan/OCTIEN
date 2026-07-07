import { Money } from '../value-objects/Money';

describe('Money Value Object', () => {
  it('prevents precision loss and strictly evaluates equality', () => {
    // Standard floats would fail 0.1 + 0.2 === 0.3
    const a = Money.create(0.1, 'USD');
    const b = Money.create(0.2, 'USD');
    const c = Money.create(0.3, 'USD');

    const result = a.add(b);
    expect(result.equals(c)).toBe(true);
  });

  it('rejects cross-currency operations', () => {
    const usd = Money.create(100, 'USD');
    const inr = Money.create(100, 'INR');

    expect(() => usd.add(inr)).toThrow('Currency mismatch: Cannot operate on USD and INR');
    expect(() => usd.subtract(inr)).toThrow('Currency mismatch: Cannot operate on USD and INR');
  });

  it('performs exact multiplication without floating point bleed', () => {
    const principal = Money.create('100.55', 'EUR');
    const multiplier = '2.5';
    // 100.55 * 2.5 = 251.375
    const result = principal.multiply(multiplier);
    
    expect(result.amount.toString()).toBe('251.375');
  });

  it('identifies negative and zero values', () => {
    const zero = Money.create(0, 'JPY');
    const negative = Money.create(-50, 'JPY');
    const positive = Money.create(50, 'JPY');

    expect(zero.isZero()).toBe(true);
    expect(negative.isNegative()).toBe(true);
    expect(positive.isPositive()).toBe(true);
  });
});
