import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { FXRate } from '../aggregates/FXRate';

export class ConsolidationService {
  
  public applyFXTranslation(localAmount: Decimal, rate: FXRate): Decimal {
    const local = parseFloat(localAmount.value);
    const fxRate = parseFloat(rate.rate.value);
    const translated = local * fxRate;
    return new Decimal(translated.toString(), 2, 38);
  }

  public applyOwnershipPercentage(translatedAmount: Decimal, percentage: Decimal): Decimal {
    const amount = parseFloat(translatedAmount.value);
    const pct = parseFloat(percentage.value) / 100;
    const final = amount * pct;
    return new Decimal(final.toString(), 2, 38);
  }

  public resolveElimination(sourceAmount: Decimal, targetAmount: Decimal): { eliminatedAmount: Decimal, varianceAmount: Decimal } {
    const src = parseFloat(sourceAmount.value);
    const tgt = parseFloat(targetAmount.value);

    const eliminated = Math.min(Math.abs(src), Math.abs(tgt));
    const variance = Math.abs(src) - Math.abs(tgt);

    return {
      eliminatedAmount: new Decimal(eliminated.toString(), 2, 38),
      varianceAmount: new Decimal(variance.toString(), 2, 38)
    };
  }

  public generateConsolidatedBalance(entityBalances: Decimal[]): Decimal {
    let total = 0;
    for (const b of entityBalances) {
      total += parseFloat(b.value);
    }
    return new Decimal(total.toString(), 2, 38);
  }
}
