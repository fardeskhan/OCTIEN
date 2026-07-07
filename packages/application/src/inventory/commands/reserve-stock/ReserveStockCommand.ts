import { Command } from '../../../shared/Command';
import { RequestContext } from '../../../shared/RequestContext';

export class ReserveStockCommand implements Command {
  constructor(
    public readonly context: RequestContext,
    public readonly productId: string,
    public readonly warehouseId: string,
    public readonly quantity: number,
    public readonly unitOfMeasure: string,
    public readonly referenceId: string,
    public readonly expiresAt: Date,
    public readonly idempotencyKey?: string
  ) {}
}
