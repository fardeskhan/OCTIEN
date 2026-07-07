import { Asset } from '../../../../domain/src/finance/assets/aggregates/Asset';
import { AccountingPeriod, AccountingPeriodStatus } from '../../../../domain/src/finance/assets/aggregates/AccountingPeriod';
import { DepreciationEngine, DepreciationResult } from '../../../../domain/src/finance/assets/services/DepreciationEngine';
import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { DepreciationExpenseCalculated } from '../../../../domain/src/finance/assets/events/AssetEvents';

export class DepreciationExecutionService {
  constructor(private engine: DepreciationEngine) {}

  public executeForAsset(
    asset: Asset,
    period: AccountingPeriod,
    accumulatedDepreciationBefore: Decimal,
    isPartialMonth: boolean,
    prorationFactor: number = 1.0
  ): { result: DepreciationResult, event: DepreciationExpenseCalculated } {
    
    if (period.status !== AccountingPeriodStatus.CLOSING) {
      throw new Error('Depreciation can only be run when the Accounting Period is CLOSING');
    }

    const result = this.engine.calculatePeriod(
      asset,
      period.periodId,
      accumulatedDepreciationBefore,
      isPartialMonth,
      prorationFactor
    );

    const event = new DepreciationExpenseCalculated(
      `evt-${Date.now()}`,
      asset.tenantId,
      new Date().toISOString(),
      asset.assetId,
      asset.assetClassId,
      period.periodId,
      result.depreciationAmount.value
    );

    return { result, event };
  }
}
