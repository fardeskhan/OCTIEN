import { CommandHandler } from '../../../shared/Command';
import { AdjustStockCommand } from './AdjustStockCommand';
import { CommandResult } from '../../../shared/CommandResult';
import { UnitOfWork } from '../../../shared/UnitOfWork';

import { ProductId } from 'domain/src/inventory/value-objects/ProductId';
import { WarehouseId } from 'domain/src/inventory/value-objects/WarehouseId';
import { Quantity } from 'domain/src/inventory/value-objects/Quantity';
import { UnitOfMeasure } from 'domain/src/inventory/value-objects/UnitOfMeasure';
import { InventoryRepository } from 'domain/src/inventory/repositories/InventoryRepository';

export class AdjustStockHandler implements CommandHandler<AdjustStockCommand, string> {
  constructor(private readonly uow: UnitOfWork) {}

  public async handle(command: AdjustStockCommand): Promise<CommandResult<string>> {
    try {
      await this.uow.start();

      const inventoryRepo = this.uow.getRepository<InventoryRepository>('InventoryRepository');

      const productId = ProductId.fromString(command.productId);
      const warehouseId = WarehouseId.fromString(command.warehouseId);
      const delta = Quantity.create(command.quantityDelta, UnitOfMeasure.create(command.unitOfMeasure));
      
      const inventory = await inventoryRepo.findInventory(productId, warehouseId);
      if (!inventory) {
        throw new Error("Inventory context not found.");
      }

      const movement = inventory.adjustStock(delta, command.context.actorId, command.reason);

      await inventoryRepo.appendMovement(movement);
      
      await this.uow.commit();
      
      const events = inventory.domainEvents;
      await this.uow.publishEvents(events);
      inventory.clearEvents();

      return CommandResult.ok(movement.movementId, events, { correlationId: command.context.correlationId });

    } catch (error: any) {
      await this.uow.rollback();
      return CommandResult.fail([error.message]);
    }
  }
}
