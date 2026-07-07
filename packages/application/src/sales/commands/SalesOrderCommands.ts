import { LineItem, PricingSnapshot, TaxSnapshot, OrderSnapshot } from '@cosmyerp/domain/src/sales/events/SalesOrderEvents';

export interface CreateSalesOrderCommand {
    salesOrderId: string;
    customerId: string;
}

export interface AddLineItemCommand {
    salesOrderId: string;
    lineId: string;
    productId: string;
    quantity: number;
    unitPrice: { amount: number; currency: string };
}

export interface RemoveLineItemCommand {
    salesOrderId: string;
    lineId: string;
}

export interface ApproveSalesOrderCommand {
    salesOrderId: string;
}

export interface ConfirmSalesOrderCommand {
    salesOrderId: string;
    pricingSnapshot: PricingSnapshot;
    taxSnapshot: TaxSnapshot;
    orderSnapshot: OrderSnapshot;
}

export interface CancelSalesOrderCommand {
    salesOrderId: string;
    reason: string;
}

export interface ApplyHoldCommand {
    salesOrderId: string;
    reason: string;
}

export interface ReleaseHoldCommand {
    salesOrderId: string;
    reason: string;
}
