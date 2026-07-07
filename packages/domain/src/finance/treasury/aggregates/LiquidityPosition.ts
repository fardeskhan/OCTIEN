import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../../shared-kernel/src/finance/Currency';

export class LiquidityPosition {
  constructor(
    public readonly liquidityId: string,
    public readonly tenantId: string,
    public readonly snapshotDate: string,
    public readonly currency: Currency,
    public readonly currentCash: Decimal,
    public readonly expectedInflows: Decimal,
    public readonly expectedOutflows: Decimal,
    public readonly netLiquidity: Decimal // Current + Inflows - Outflows
  ) {}
}
