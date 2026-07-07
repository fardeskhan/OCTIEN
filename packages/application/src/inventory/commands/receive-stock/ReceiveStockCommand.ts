import { Command } from '../../../shared/Command';
import { RequestContext } from '../../../shared/RequestContext';

export class ReceiveStockCommand implements Command {
  constructor(
    public readonly context: RequestContext,
    public readonly inventoryId: string,
    public readonly productId: string,
    public readonly warehouseId: string,
    public readonly quantity: number,
    public readonly unitOfMeasure: string,
    public readonly batchId?: string,
    public readonly idempotencyKey?: string
  ) {}
}
