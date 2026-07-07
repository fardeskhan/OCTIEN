export type UOM = 'LITERS' | 'KILOGRAMS' | 'PALLETS' | 'CARTONS' | 'UNITS';

export class UnitOfMeasure {
  private constructor(public readonly value: UOM) {}

  public static create(value: string): UnitOfMeasure {
    const validUOMs: UOM[] = ['LITERS', 'KILOGRAMS', 'PALLETS', 'CARTONS', 'UNITS'];
    const normalized = value.trim().toUpperCase() as UOM;
    
    if (!validUOMs.includes(normalized)) {
      throw new Error(`Invalid Unit of Measure: ${value}. Must be one of ${validUOMs.join(', ')}`);
    }
    return new UnitOfMeasure(normalized);
  }

  public equals(other: UnitOfMeasure): boolean {
    return this.value === other.value;
  }
}
