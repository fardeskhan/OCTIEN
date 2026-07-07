import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export class ForecastResult {
  constructor(
    public readonly resultId: string,
    public readonly forecastRunId: string,
    public readonly metricName: string,
    public readonly periodId: string,
    public readonly value: Decimal
  ) {}
}
