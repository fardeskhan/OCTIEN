import { randomUUID } from 'crypto';

export class InventoryId {
  private constructor(public readonly value: string) {}

  public static generate(): InventoryId {
    return new InventoryId(randomUUID());
  }

  public static fromString(value: string): InventoryId {
    if (!value || value.trim().length === 0) {
      throw new Error("InventoryId cannot be empty.");
    }
    return new InventoryId(value.trim());
  }

  public equals(other: InventoryId): boolean {
    return this.value === other.value;
  }
}
