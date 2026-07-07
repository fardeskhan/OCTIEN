import { CommandHandler } from '../../../shared/Command';
import { ReserveStockCommand } from './ReserveStockCommand';
import { CommandResult } from '../../../shared/CommandResult';
import { UnitOfWork } from '../../../shared/UnitOfWork';
import { ValidationFailedException } from '../../../shared/ApplicationException';

import { ProductId } from 'domain/src/inventory/value-objects/ProductId';
import { WarehouseId } from 'domain/src/inventory/value-objects/WarehouseId';
import { Quantity } from 'domain/src/inventory/value-objects/Quantity';
import { UnitOfMeasure } from 'domain/src/inventory/value-objects/UnitOfMeasure';
import { InventoryRepository } from 'domain/src/inventory/repositories/InventoryRepository';
import { ReservationRepository } from 'domain/src/inventory/repositories/ReservationRepository';
import { CanReserveStockSpecification } from 'domain/src/inventory/specifications/CanReserveStockSpecification';
import { NegativeInventoryPolicy } from 'domain/src/inventory/policies/NegativeInventoryPolicy';

export class ReserveStockHandler implements CommandHandler<ReserveStockCommand, string> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly policy: NegativeInventoryPolicy
  ) {}

  public async handle(command: ReserveStockCommand): Promise<CommandResult<string>> {
    try {
      if (command.quantity <= 0) {
        throw new ValidationFailedException(['Quantity must be greater than zero.']);
      }

      await this.uow.start();

      const inventoryRepo = this.uow.getRepository<InventoryRepository>('InventoryRepository');
      const reservationRepo = this.uow.getRepository<ReservationRepository>('ReservationRepository');
      const balanceRepo = this.uow.getRepository<any>('InventoryBalanceRepository'); 

      const productId = ProductId.fromString(command.productId);
      const warehouseId = WarehouseId.fromString(command.warehouseId);
      const quantity = Quantity.create(command.quantity, UnitOfMeasure.create(command.unitOfMeasure));
      
      const inventory = await inventoryRepo.findInventory(productId, warehouseId);
      if (!inventory) {
        throw new Error("Inventory context not found for this product/warehouse.");
      }

      // Check Domain Specification against Read Model
      const balance = await balanceRepo.getBalance(inventory.id);
      const spec = new CanReserveStockSpecification(this.policy);
      
      const canReserve = await spec.isSatisfiedBy(command.context.businessId, balance, quantity);
      if (!canReserve) {
        throw new Error("Insufficient stock to fulfill reservation, and negative inventory policy forbids backorders.");
      }

      // Execute Domain Logic
      const reservation = inventory.reserveStock(quantity, command.referenceId, command.expiresAt, command.context.actorId);

      await reservationRepo.save(reservation);
      
      await this.uow.commit();
      
      const events = [...inventory.domainEvents, ...reservation.domainEvents];
      await this.uow.publishEvents(events);
      inventory.clearEvents();
      reservation.clearEvents();

      return CommandResult.ok(reservation.id, events, { correlationId: command.context.correlationId });

    } catch (error: any) {
      await this.uow.rollback();
      return CommandResult.fail([error.message]);
    }
  }
}
