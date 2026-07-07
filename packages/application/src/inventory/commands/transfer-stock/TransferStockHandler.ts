import { CommandHandler } from '../../../shared/Command';
import { TransferStockCommand } from './TransferStockCommand';
import { CommandResult } from '../../../shared/CommandResult';
import { UnitOfWork } from '../../../shared/UnitOfWork';

import { ProductId } from 'domain/src/inventory/value-objects/ProductId';
import { WarehouseId } from 'domain/src/inventory/value-objects/WarehouseId';
import { Quantity } from 'domain/src/inventory/value-objects/Quantity';
import { UnitOfMeasure } from 'domain/src/inventory/value-objects/UnitOfMeasure';
import { InventoryRepository } from 'domain/src/inventory/repositories/InventoryRepository';

export class TransferStockHandler implements CommandHandler<TransferStockCommand, string> {
  constructor(private readonly uow: UnitOfWork) {}

  public async handle(command: TransferStockCommand): Promise<CommandResult<string>> {
    try {
      await this.uow.start();

      const inventoryRepo = this.uow.getRepository<InventoryRepository>('InventoryRepository');

      const productId = ProductId.fromString(command.productId);
      const sourceWarehouseId = WarehouseId.fromString(command.sourceWarehouseId);
      const destWarehouseId = WarehouseId.fromString(command.destinationWarehouseId);
      const quantity = Quantity.create(command.quantity, UnitOfMeasure.create(command.unitOfMeasure));
      
      const sourceInventory = await inventoryRepo.findInventory(productId, sourceWarehouseId);
      if (!sourceInventory) {
        throw new Error("Source inventory context not found.");
      }

      // Execute Domain Logic (Generates TRANSFER_OUT event and movement)
      const movements = sourceInventory.transferStock(quantity, destWarehouseId, command.context.actorId);

      for (const m of movements) {
        await inventoryRepo.appendMovement(m);
      }
      
      await this.uow.commit();
      
      const events = sourceInventory.domainEvents;
      await this.uow.publishEvents(events);
      sourceInventory.clearEvents();
      
      return CommandResult.ok(sourceInventory.id.value, events, { correlationId: command.context.correlationId });

    } catch (error: any) {
      await this.uow.rollback();
      return CommandResult.fail([error.message]);
    }
  }
}
