import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export class DriverDefinition {
  constructor(
    public readonly driverId: string,
    public readonly name: string,
    public readonly unit: string,
    public readonly defaultValue: Decimal
  ) {}
}
