import { CanonicalSerializer } from './CanonicalSerializer';

/**
 * Pure Dependency-Free Financial Kernel: PostingIdempotencyKey
 * Guarantees duplicate prevention across all bounded contexts.
 */
export class PostingIdempotencyKey {
  public readonly value: string;

  constructor(
    tenantId: string,
    sourceCapability: string,
    originEventId: string,
    contractVersion: string,
    financialIntent: string
  ) {
    const payload = {
      tenantId,
      sourceCapability,
      originEventId,
      contractVersion,
      financialIntent
    };
    this.value = CanonicalSerializer.hash(payload, 'sha256');
  }

  equals(other: PostingIdempotencyKey): boolean {
    return this.value === other.value;
  }
}
