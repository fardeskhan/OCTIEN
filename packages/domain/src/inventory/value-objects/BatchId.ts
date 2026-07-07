import { randomUUID } from 'crypto';

export class BatchId {
  private constructor(public readonly value: string) {}

  public static generate(): BatchId {
    return new BatchId(randomUUID());
  }

  public static fromString(value: string): BatchId {
    if (!value || value.trim().length === 0) {
      throw new Error("BatchId cannot be empty.");
    }
    return new BatchId(value.trim());
  }

  public equals(other: BatchId): boolean {
    return this.value === other.value;
  }
}
