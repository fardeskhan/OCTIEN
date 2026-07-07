import { randomUUID } from 'crypto';

export class ProductId {
  private constructor(public readonly value: string) {}

  public static generate(): ProductId {
    return new ProductId(randomUUID());
  }

  public static fromString(value: string): ProductId {
    if (!value || value.trim().length === 0) {
      throw new Error("ProductId cannot be empty.");
    }
    return new ProductId(value.trim());
  }

  public equals(other: ProductId): boolean {
    return this.value === other.value;
  }
}
