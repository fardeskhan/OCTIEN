import { Command } from '../../../shared/Command';
import { RequestContext } from '../../../shared/RequestContext';

export class TransferStockCommand implements Command {
  constructor(
    public readonly context: RequestContext,
    public readonly productId: string,
    public readonly sourceWarehouseId: string,
    public readonly destinationWarehouseId: string,
    public readonly quantity: number,
    public readonly unitOfMeasure: string,
    public readonly idempotencyKey?: string
  ) {}
}
