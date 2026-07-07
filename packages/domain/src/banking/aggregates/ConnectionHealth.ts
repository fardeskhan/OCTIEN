import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';

export enum HealthStatus {
  Healthy = 'HEALTHY',
  Warning = 'WARNING',
  Offline = 'OFFLINE'
}

export class ConnectionHealth extends AggregateRoot<string> {
  private _tenantId: TenantId;
  private _connectionId: string;
  private _status: HealthStatus;
  private _healthScore: number; // 0 to 100
  private _latencyMs: number;
  private _failureCount: number;
  private _lastSuccess?: Date;
  private _lastFailure?: Date;

  private constructor(
    id: string,
    tenantId: TenantId,
    connectionId: string,
    status: HealthStatus,
    healthScore: number
  ) {
    super(id);
    this._tenantId = tenantId;
    this._connectionId = connectionId;
    this._status = status;
    this._healthScore = healthScore;
    this._latencyMs = 0;
    this._failureCount = 0;
  }

  public static track(id: string, tenantId: TenantId, connectionId: string): ConnectionHealth {
    return new ConnectionHealth(id, tenantId, connectionId, HealthStatus.Healthy, 100);
  }

  public recordSuccess(latencyMs: number, timestamp: Date): void {
    this._latencyMs = latencyMs;
    this._lastSuccess = timestamp;
    this._healthScore = Math.min(100, this._healthScore + 5);
    this._status = this._healthScore > 50 ? HealthStatus.Healthy : HealthStatus.Warning;
  }

  public recordFailure(timestamp: Date): void {
    this._lastFailure = timestamp;
    this._failureCount += 1;
    this._healthScore = Math.max(0, this._healthScore - 20);
    this._status = this._healthScore === 0 ? HealthStatus.Offline : HealthStatus.Warning;
    // this.addDomainEvent(new ConnectionHealthChangedEvent(this.connectionId, this._status));
  }

  get tenantId(): TenantId { return this._tenantId; }
  get connectionId(): string { return this._connectionId; }
  get status(): HealthStatus { return this._status; }
  get healthScore(): number { return this._healthScore; }
}
