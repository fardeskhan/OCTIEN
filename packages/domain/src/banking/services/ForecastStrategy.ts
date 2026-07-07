import { TenantId } from '../../../../shared-kernel/src/domain/value-objects/TenantId';

export interface CashForecastResult {
  date: Date;
  projectedInflow: number;
  projectedOutflow: number;
  netPosition: number;
  confidenceScore: number;
}

export interface ForecastStrategy {
  readonly strategyName: string;
  generate(
    tenantId: TenantId,
    targetDate: Date,
    historicalDataRangeDays: number
  ): Promise<CashForecastResult>;
}

export class HistoricalAverageStrategy implements ForecastStrategy {
  public readonly strategyName = 'HISTORICAL_AVERAGE';

  async generate(
    tenantId: TenantId,
    targetDate: Date,
    historicalDataRangeDays: number
  ): Promise<CashForecastResult> {
    // Basic implementation to be injected by TreasuryCalculationService
    return {
      date: targetDate,
      projectedInflow: 0,
      projectedOutflow: 0,
      netPosition: 0,
      confidenceScore: 50
    };
  }
}
