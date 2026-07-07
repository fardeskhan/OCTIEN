import { CommandHandler } from '../../../shared/Command';
import { ReceiveStockCommand } from './ReceiveStockCommand';
import { CommandResult } from '../../../shared/CommandResult';
import { UnitOfWork } from '../../../shared/UnitOfWork';
import { ValidationFailedException } from '../../../shared/ApplicationException';

// Mocks to resolve domain imports in this environment snippet
import { ProductId } from 'domain/src/inventory/value-objects/ProductId';
import { WarehouseId } from 'domain/src/inventory/value-objects/WarehouseId';
import { Quantity } from 'domain/src/inventory/value-objects/Quantity';
import { UnitOfMeasure } from 'domain/src/inventory/value-objects/UnitOfMeasure';
import { BatchId } from 'domain/src/inventory/value-objects/BatchId';
import { InventoryRepository } from 'domain/src/inventory/repositories/InventoryRepository';

export class ReceiveStockHandler implements CommandHandler<ReceiveStockCommand, string> {
  constructor(private readonly uow: UnitOfWork) {}

  public async handle(command: ReceiveStockCommand): Promise<CommandResult<string>> {
    try {
      // 1. Authorization is handled upstream by PipelineBehaviors!
      
      // 2. Application Validation
      if (command.quantity <= 0) {
        throw new ValidationFailedException(['Quantity must be greater than zero.']);
      }

      await this.uow.start();

      const inventoryRepo = this.uow.getRepository<InventoryRepository>('InventoryRepository');

      // 3. Load Aggregate
      const productId = ProductId.fromString(command.productId);
      const warehouseId = WarehouseId.fromString(command.warehouseId);
      
      const inventory = await inventoryRepo.findInventory(productId, warehouseId);
      if (!inventory) {
        throw new Error("Inventory context not found.");
      }

      // 4. Execute Domain Logic
      const quantity = Quantity.create(command.quantity, UnitOfMeasure.create(command.unitOfMeasure));
      const batchId = command.batchId ? BatchId.fromString(command.batchId) : undefined;
      
      const movement = inventory.receiveStock(quantity, command.context.actorId, batchId);

      // 5. Persist Domain Object
      await inventoryRepo.appendMovement(movement);
      
      // 6. Commit triggers Outbox writes and Read Model syncs via UnitOfWork interceptors
      await this.uow.commit();

      // 7. Publish Domain Events natively
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
