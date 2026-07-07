import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';

export enum BankConnectionStatus {
  Pending = 'PENDING',
  Connected = 'CONNECTED',
  Disconnected = 'DISCONNECTED',
  Error = 'ERROR'
}

export class BankConnection extends AggregateRoot<string> {
  private _tenantId: TenantId;
  private _bankIdentifier: string; // e.g., 'ICICI', 'HDFC'
  private _credentialReferenceId: string; // Stored securely in Platform Secrets
  private _status: BankConnectionStatus;
  private _capabilities: string[]; // e.g., ['Balances', 'Statements', 'Webhooks']

  private constructor(
    id: string,
    tenantId: TenantId,
    bankIdentifier: string,
    credentialReferenceId: string,
    capabilities: string[] = []
  ) {
    super(id);
    this._tenantId = tenantId;
    this._bankIdentifier = bankIdentifier;
    this._credentialReferenceId = credentialReferenceId;
    this._status = BankConnectionStatus.Pending;
    this._capabilities = capabilities;
  }

  public static create(
    id: string,
    tenantId: TenantId,
    bankIdentifier: string,
    credentialReferenceId: string
  ): BankConnection {
    return new BankConnection(id, tenantId, bankIdentifier, credentialReferenceId);
  }

  public markConnected(capabilities: string[]): void {
    this._status = BankConnectionStatus.Connected;
    this._capabilities = capabilities;
    // this.addDomainEvent(new BankConnectedEvent(this.id, this._tenantId));
  }

  public markDisconnected(): void {
    this._status = BankConnectionStatus.Disconnected;
    // this.addDomainEvent(new BankDisconnectedEvent(this.id, this._tenantId));
  }

  get tenantId(): TenantId { return this._tenantId; }
  get bankIdentifier(): string { return this._bankIdentifier; }
  get credentialReferenceId(): string { return this._credentialReferenceId; }
  get status(): BankConnectionStatus { return this._status; }
  get capabilities(): ReadonlyArray<string> { return this._capabilities; }
}
