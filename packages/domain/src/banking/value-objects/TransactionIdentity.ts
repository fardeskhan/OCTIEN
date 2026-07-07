import { createHash } from 'crypto';

export class TransactionIdentity {
  public readonly hash: string;

  constructor(
    public readonly institutionId: string,
    public readonly accountId: string,
    public readonly bankReference: string,
    public readonly utr: string | null,
    public readonly valueDate: Date,
    public readonly amount: number,
    public readonly currency: string
  ) {
    if (!institutionId || !accountId || !bankReference || !valueDate || !currency) {
      throw new Error("Missing critical identity fields for transaction duplicate detection.");
    }
    this.hash = this.generateDeterministicHash();
  }

  private generateDeterministicHash(): string {
    const payload = `${this.institutionId}|${this.accountId}|${this.bankReference}|${this.utr || ''}|${this.valueDate.toISOString().split('T')[0]}|${this.amount.toFixed(4)}|${this.currency}`;
    return createHash('sha256').update(payload).digest('hex');
  }

  public equals(other: TransactionIdentity): boolean {
    return this.hash === other.hash;
  }
}
