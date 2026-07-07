import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export class DriverValue {
  constructor(
    public readonly driverId: string,
    public readonly periodId: string,
    public readonly value: Decimal,
    public readonly scenarioId?: string // Nullable to support fallback hierarchy
  ) {}
}
