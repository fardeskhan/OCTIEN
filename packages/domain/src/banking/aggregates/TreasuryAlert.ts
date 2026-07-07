import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';

export enum AlertSeverity {
  Info = 'INFO',
  Warning = 'WARNING',
  Critical = 'CRITICAL'
}

export enum AlertType {
  LowBalance = 'LOW_BALANCE',
  LargeCredit = 'LARGE_CREDIT',
  LargeDebit = 'LARGE_DEBIT',
  TokenExpiring = 'TOKEN_EXPIRING',
  ConnectionOffline = 'CONNECTION_OFFLINE',
  StatementMissing = 'STATEMENT_MISSING',
  SyncFailure = 'SYNC_FAILURE',
  DuplicateTransactions = 'DUPLICATE_TRANSACTIONS',
  CashFlowRisk = 'CASH_FLOW_RISK',
  FxExposure = 'FX_EXPOSURE'
}

export class TreasuryAlert extends AggregateRoot<string> {
  private _tenantId: TenantId;
  private _type: AlertType;
  private _severity: AlertSeverity;
  private _message: string;
  private _metadata: Record<string, any>;
  private _isResolved: boolean;

  private constructor(
    id: string,
    tenantId: TenantId,
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    metadata: Record<string, any>
  ) {
    super(id);
    this._tenantId = tenantId;
    this._type = type;
    this._severity = severity;
    this._message = message;
    this._metadata = metadata;
    this._isResolved = false;
  }

  public static raise(
    id: string,
    tenantId: TenantId,
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    metadata: Record<string, any> = {}
  ): TreasuryAlert {
    return new TreasuryAlert(id, tenantId, type, severity, message, metadata);
  }

  public resolve(): void {
    this._isResolved = true;
  }

  get tenantId(): TenantId { return this._tenantId; }
  get type(): AlertType { return this._type; }
  get severity(): AlertSeverity { return this._severity; }
}
