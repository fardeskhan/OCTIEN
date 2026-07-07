import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';

export class TreasuryRisk extends AggregateRoot<string> {
  private _tenantId: TenantId;
  private _liquidityRiskScore: number;
  private _counterpartyRiskScore: number;
  private _concentrationRiskScore: number;
  private _fxRiskScore: number;
  private _creditExposure: number;

  private constructor(
    id: string,
    tenantId: TenantId
  ) {
    super(id);
    this._tenantId = tenantId;
    this._liquidityRiskScore = 0;
    this._counterpartyRiskScore = 0;
    this._concentrationRiskScore = 0;
    this._fxRiskScore = 0;
    this._creditExposure = 0;
  }

  public static track(id: string, tenantId: TenantId): TreasuryRisk {
    return new TreasuryRisk(id, tenantId);
  }

  // Domain logic will be expanded in future sprints. 
  // Frozen here to reserve the capability for future CAP-BANKING integrations.

  get tenantId(): TenantId { return this._tenantId; }
}
