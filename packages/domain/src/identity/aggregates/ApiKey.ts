import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';

export enum ApiKeyStatus {
  Active = 'ACTIVE',
  Revoked = 'REVOKED',
  Expired = 'EXPIRED'
}

export class ApiKey extends AggregateRoot<string> {
  private _tenantId: TenantId;
  private _name: string;
  private _keyHash: string; // We NEVER store the raw key
  private _scopes: Set<string>;
  private _status: ApiKeyStatus;
  private _expiresAt?: Date;

  private constructor(
    id: string,
    tenantId: TenantId,
    name: string,
    keyHash: string,
    scopes: string[],
    expiresAt?: Date
  ) {
    super(id);
    this._tenantId = tenantId;
    this._name = name;
    this._keyHash = keyHash;
    this._scopes = new Set(scopes);
    this._status = ApiKeyStatus.Active;
    this._expiresAt = expiresAt;
  }

  public static create(
    id: string,
    tenantId: TenantId,
    name: string,
    keyHash: string,
    scopes: string[] = [],
    expiresAt?: Date
  ): ApiKey {
    return new ApiKey(id, tenantId, name, keyHash, scopes, expiresAt);
  }

  public revoke(): void {
    if (this._status === ApiKeyStatus.Revoked) {
      throw new Error("API Key is already revoked.");
    }
    this._status = ApiKeyStatus.Revoked;
    // this.addDomainEvent(new ApiKeyRevokedEvent(this.id, this._tenantId));
  }

  public isExpired(currentDate: Date): boolean {
    if (this._expiresAt && currentDate > this._expiresAt) {
      this._status = ApiKeyStatus.Expired;
      return true;
    }
    return false;
  }

  get tenantId(): TenantId { return this._tenantId; }
  get name(): string { return this._name; }
  get keyHash(): string { return this._keyHash; }
  get scopes(): ReadonlyArray<string> { return Array.from(this._scopes); }
  get status(): ApiKeyStatus { return this._status; }
}
