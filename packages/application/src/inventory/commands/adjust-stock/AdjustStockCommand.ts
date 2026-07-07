import { Command } from '../../../shared/Command';
import { RequestContext } from '../../../shared/RequestContext';

export class AdjustStockCommand implements Command {
  constructor(
    public readonly context: RequestContext,
    public readonly productId: string,
    public readonly warehouseId: string,
    public readonly quantityDelta: number, // Can be negative or positive
    public readonly unitOfMeasure: string,
    public readonly reason: string,
    public readonly idempotencyKey?: string
  ) {}
}
