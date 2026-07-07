export class JournalIdempotencyKey {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Journal Idempotency Key cannot be empty');
    }
  }

  equals(other: JournalIdempotencyKey): boolean {
    return this.value === other.value;
  }
}
