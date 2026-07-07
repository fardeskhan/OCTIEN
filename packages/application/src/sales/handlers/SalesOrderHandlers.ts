import { SalesOrder } from '@cosmyerp/domain/src/sales/aggregates/SalesOrder';
import { SalesOrderRepository } from '@cosmyerp/application/src/sales/interfaces/SalesOrderRepository';
import { 
    CreateSalesOrderCommand, AddLineItemCommand, RemoveLineItemCommand,
    ApproveSalesOrderCommand, ConfirmSalesOrderCommand, CancelSalesOrderCommand,
    ApplyHoldCommand, ReleaseHoldCommand 
} from '../commands/SalesOrderCommands';

export interface CommandResult {
    aggregateId: string;
    version: number;
}

export class CreateSalesOrderHandler {
    constructor(private repo: SalesOrderRepository) {}
    
    async execute(command: CreateSalesOrderCommand): Promise<CommandResult> {
        const order = SalesOrder.create(command.salesOrderId, command.customerId);
        await this.repo.save(order, 0); // Expected version 0 for new aggregate
        return { aggregateId: order.aggregateId, version: order.aggregateVersion };
    }
}

export class AddLineItemHandler {
    constructor(private repo: SalesOrderRepository) {}
    
    async execute(command: AddLineItemCommand, expectedVersion: number): Promise<CommandResult> {
        const order = await this.repo.load(command.salesOrderId);
        order.addLineItem({
            lineId: command.lineId,
            productId: command.productId,
            quantity: command.quantity,
            unitPrice: command.unitPrice
        });
        await this.repo.save(order, expectedVersion);
        return { aggregateId: order.aggregateId, version: order.aggregateVersion };
    }
}

export class RemoveLineItemHandler {
    constructor(private repo: SalesOrderRepository) {}
    
    async execute(command: RemoveLineItemCommand, expectedVersion: number): Promise<CommandResult> {
        const order = await this.repo.load(command.salesOrderId);
        order.removeLineItem(command.lineId);
        await this.repo.save(order, expectedVersion);
        return { aggregateId: order.aggregateId, version: order.aggregateVersion };
    }
}

export class ApproveSalesOrderHandler {
    constructor(private repo: SalesOrderRepository) {}
    
    async execute(command: ApproveSalesOrderCommand, expectedVersion: number): Promise<CommandResult> {
        const order = await this.repo.load(command.salesOrderId);
        order.approve();
        await this.repo.save(order, expectedVersion);
        return { aggregateId: order.aggregateId, version: order.aggregateVersion };
    }
}

export class ConfirmSalesOrderHandler {
    constructor(private repo: SalesOrderRepository) {}
    
    async execute(command: ConfirmSalesOrderCommand, expectedVersion: number): Promise<CommandResult> {
        const order = await this.repo.load(command.salesOrderId);
        order.confirm(command.pricingSnapshot, command.taxSnapshot, command.orderSnapshot);
        await this.repo.save(order, expectedVersion);
        return { aggregateId: order.aggregateId, version: order.aggregateVersion };
    }
}

export class CancelSalesOrderHandler {
    constructor(private repo: SalesOrderRepository) {}
    
    async execute(command: CancelSalesOrderCommand, expectedVersion: number): Promise<CommandResult> {
        const order = await this.repo.load(command.salesOrderId);
        order.cancel(command.reason);
        await this.repo.save(order, expectedVersion);
        return { aggregateId: order.aggregateId, version: order.aggregateVersion };
    }
}

export class ApplyHoldHandler {
    constructor(private repo: SalesOrderRepository) {}
    
    async execute(command: ApplyHoldCommand, expectedVersion: number): Promise<CommandResult> {
        const order = await this.repo.load(command.salesOrderId);
        order.applyHold(command.reason);
        await this.repo.save(order, expectedVersion);
        return { aggregateId: order.aggregateId, version: order.aggregateVersion };
    }
}

export class ReleaseHoldHandler {
    constructor(private repo: SalesOrderRepository) {}
    
    async execute(command: ReleaseHoldCommand, expectedVersion: number): Promise<CommandResult> {
        const order = await this.repo.load(command.salesOrderId);
        order.releaseHold(command.reason);
        await this.repo.save(order, expectedVersion);
        return { aggregateId: order.aggregateId, version: order.aggregateVersion };
    }
}
