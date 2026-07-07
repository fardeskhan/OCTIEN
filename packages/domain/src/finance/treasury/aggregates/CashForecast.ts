import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../../shared-kernel/src/finance/Currency';
import { ForecastAssumption } from './ForecastAssumption';

export class CashForecast {
  constructor(
    public readonly forecastId: string,
    public readonly tenantId: string,
    public readonly targetDate: string,
    public readonly currency: Currency,
    public readonly expectedInflows: Decimal, // E.g., Open AR
    public readonly expectedOutflows: Decimal, // E.g., Open AP
    public readonly netForecastAmount: Decimal, // Inflows - Outflows
    public readonly assumptions: ForecastAssumption[]
  ) {}

  public calculateDrift(actualAmount: Decimal): Decimal {
    // Variance = Forecast - Actual
    return new Decimal(this.netForecastAmount.value).subtract(actualAmount);
  }
}
