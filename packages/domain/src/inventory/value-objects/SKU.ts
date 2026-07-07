export class SKU {
  private constructor(public readonly value: string) {}

  public static create(value: string): SKU {
    if (!value || value.trim().length === 0) {
      throw new Error("SKU cannot be empty.");
    }
    // Business rule: SKUs are always uppercase, spaces replaced by hyphens
    const normalized = value.trim().toUpperCase().replace(/\s+/g, '-');
    return new SKU(normalized);
  }

  public equals(other: SKU): boolean {
    return this.value === other.value;
  }
}
