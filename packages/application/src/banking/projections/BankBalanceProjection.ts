import { IProjection, ProjectionMetadata } from '../../../../shared-kernel/src/projections/IProjection';
import { createHash } from 'crypto';

export class BankBalanceProjection implements IProjection<any> {
  private _tenantId: string;
  private _accountId: string;
  private _balance: number;
  private _currency: string;
  private _lastUpdated: Date;

  constructor(tenantId: string, accountId: string, balance: number, currency: string) {
    this._tenantId = tenantId;
    this._accountId = accountId;
    this._balance = balance;
    this._currency = currency;
    this._lastUpdated = new Date();
  }

  projectionId(): string {
    return 'banking.projections.bank_balance';
  }

  projectionName(): string {
    return 'Bank Balance Projection';
  }

  projectionVersion(): number {
    return 1;
  }

  schemaVersion(): number {
    return 1;
  }

  supportedEvents(): string[] {
    return ['BALANCE_UPDATED', 'ACCOUNT_DISCOVERED'];
  }

  async apply(event: any, metadata: ProjectionMetadata): Promise<void> {
    if (event.type === 'BALANCE_UPDATED') {
      this._balance = event.payload.newBalance;
      this._lastUpdated = metadata.lastProcessedTimestamp;
    } else if (event.type === 'ACCOUNT_DISCOVERED') {
      this._balance = 0;
      this._currency = event.payload.currency;
      this._lastUpdated = metadata.lastProcessedTimestamp;
    }
  }

  async rebuild(events: any[]): Promise<void> {
    this._balance = 0;
    for (const event of events) {
      await this.apply(event, { lastProcessedTimestamp: new Date() } as ProjectionMetadata);
    }
  }

  checksum(): string {
    const payload = `${this._tenantId}|${this._accountId}|${this._balance.toFixed(4)}|${this._currency}`;
    return createHash('sha256').update(payload).digest('hex');
  }

  validate(): boolean {
    return this._balance >= 0 && this._currency.length === 3;
  }

  health(): { status: "Healthy" | "Degraded" | "Failed"; lagMs: number; eventsBehind: number; errorCount: number; lastReplay: Date | null; checksum: string; schemaVersion: number; } {
    return {
      status: 'Healthy',
      lagMs: 0,
      eventsBehind: 0,
      errorCount: 0,
      lastReplay: null,
      checksum: this.checksum(),
      schemaVersion: this.schemaVersion()
    };
  }

  get balance(): number { return this._balance; }
  get currency(): string { return this._currency; }
}
