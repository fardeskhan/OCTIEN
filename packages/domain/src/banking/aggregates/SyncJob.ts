import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';

export enum SyncJobStatus {
  Running = 'RUNNING',
  Completed = 'COMPLETED',
  Failed = 'FAILED'
}

export class SyncJob extends AggregateRoot<string> {
  private _tenantId: TenantId;
  private _connectionId: string;
  private _status: SyncJobStatus;
  private _recordsProcessed: number;
  private _checkpointCursor?: string;
  private _durationMs: number;
  private _startedAt: Date;

  private constructor(
    id: string,
    tenantId: TenantId,
    connectionId: string,
    startedAt: Date
  ) {
    super(id);
    this._tenantId = tenantId;
    this._connectionId = connectionId;
    this._status = SyncJobStatus.Running;
    this._recordsProcessed = 0;
    this._durationMs = 0;
    this._startedAt = startedAt;
  }

  public static start(id: string, tenantId: TenantId, connectionId: string, startedAt: Date): SyncJob {
    return new SyncJob(id, tenantId, connectionId, startedAt);
  }

  public updateCheckpoint(cursor: string, processedCount: number): void {
    if (this._status !== SyncJobStatus.Running) throw new Error("Job not running");
    this._checkpointCursor = cursor;
    this._recordsProcessed += processedCount;
  }

  public finish(completedAt: Date): void {
    this._status = SyncJobStatus.Completed;
    this._durationMs = completedAt.getTime() - this._startedAt.getTime();
  }

  public fail(failedAt: Date): void {
    this._status = SyncJobStatus.Failed;
    this._durationMs = failedAt.getTime() - this._startedAt.getTime();
  }

  get status(): SyncJobStatus { return this._status; }
  get recordsProcessed(): number { return this._recordsProcessed; }
  get checkpointCursor(): string | undefined { return this._checkpointCursor; }
}
