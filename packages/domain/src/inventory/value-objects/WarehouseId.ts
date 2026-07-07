import { randomUUID } from 'crypto';

export class WarehouseId {
  private constructor(public readonly value: string) {}

  public static generate(): WarehouseId {
    return new WarehouseId(randomUUID());
  }

  public static fromString(value: string): WarehouseId {
    if (!value || value.trim().length === 0) {
      throw new Error("WarehouseId cannot be empty.");
    }
    return new WarehouseId(value.trim());
  }

  public equals(other: WarehouseId): boolean {
    return this.value === other.value;
  }
}
