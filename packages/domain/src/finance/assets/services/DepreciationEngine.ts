import { Asset } from '../aggregates/Asset';
import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export interface DepreciationResult {
  assetId: string;
  periodId: string;
  depreciationAmount: Decimal;
  accumulatedDepreciation: Decimal;
  carryingValue: Decimal;
}

export class DepreciationEngine {
  
  public calculatePeriod(
    asset: Asset,
    periodId: string,
    accumulatedDepreciationBefore: Decimal,
    isPartialMonth: boolean,
    prorationFactor: number = 1.0
  ): DepreciationResult {
    
    const cost = parseFloat(asset.acquisitionCost.value);
    const residual = parseFloat(asset.residualValue.value);
    const usefulLife = asset.usefulLifeMonths;
    const accumDepr = parseFloat(accumulatedDepreciationBefore.value);

    let carryingValue = cost - accumDepr;

    // Fully Depreciated Check
    if (carryingValue <= residual) {
      return {
        assetId: asset.assetId,
        periodId,
        depreciationAmount: new Decimal('0', 2, 38),
        accumulatedDepreciation: accumulatedDepreciationBefore,
        carryingValue: new Decimal(carryingValue.toString(), 2, 38)
      };
    }

    let monthlyDepreciation = (cost - residual) / usefulLife;

    if (isPartialMonth) {
      monthlyDepreciation = monthlyDepreciation * prorationFactor;
    }

    // Don't depreciate below residual value
    if (carryingValue - monthlyDepreciation < residual) {
      monthlyDepreciation = carryingValue - residual;
    }

    const newAccumDepr = accumDepr + monthlyDepreciation;
    carryingValue = cost - newAccumDepr;

    return {
      assetId: asset.assetId,
      periodId,
      depreciationAmount: new Decimal(monthlyDepreciation.toString(), 2, 38),
      accumulatedDepreciation: new Decimal(newAccumDepr.toString(), 2, 38),
      carryingValue: new Decimal(carryingValue.toString(), 2, 38)
    };
  }
}
