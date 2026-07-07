import { DomainEvent } from '../domain/DomainEvent';

export type Money = { amount: number; currency: string };

export type LineItem = {
    lineId: string;
    productId: string;
    quantity: number;
    unitPrice: Money;
};

export interface PricingSnapshot {
    totalAmount: number;
    discounts: number;
}

export interface TaxSnapshot {
    totalTax: number;
    taxRates: any[];
}

export interface OrderSnapshot {
    customerReference?: string;
    termsAndConditions?: string;
}

export class SalesOrderCreated implements DomainEvent<{ customerId: string }> {
    public aggregateType = 'SalesOrder';
    public eventType = 'SalesOrderCreated';
    public timestamp = new Date();
    public metadata = {};

    constructor(
        public eventId: string,
        public aggregateId: string,
        public eventVersion: number,
        public payload: { customerId: string }
    ) {}
}

export class SalesOrderApproved implements DomainEvent<void> {
    public aggregateType = 'SalesOrder';
    public eventType = 'SalesOrderApproved';
    public timestamp = new Date();
    public metadata = {};

    constructor(
        public eventId: string,
        public aggregateId: string,
        public eventVersion: number,
        public payload: void
    ) {}
}

export class SalesOrderConfirmed implements DomainEvent<{ pricingSnapshot: PricingSnapshot, taxSnapshot: TaxSnapshot, orderSnapshot: OrderSnapshot }> {
    public aggregateType = 'SalesOrder';
    public eventType = 'SalesOrderConfirmed';
    public timestamp = new Date();
    public metadata = {};

    constructor(
        public eventId: string,
        public aggregateId: string,
        public eventVersion: number,
        public payload: { pricingSnapshot: PricingSnapshot, taxSnapshot: TaxSnapshot, orderSnapshot: OrderSnapshot }
    ) {}
}

export class SalesOrderLineItemAdded implements DomainEvent<{ item: LineItem }> {
    public aggregateType = 'SalesOrder';
    public eventType = 'SalesOrderLineItemAdded';
    public timestamp = new Date();
    public metadata = {};

    constructor(
        public eventId: string,
        public aggregateId: string,
        public eventVersion: number,
        public payload: { item: LineItem }
    ) {}
}

export class SalesOrderLineItemRemoved implements DomainEvent<{ lineId: string }> {
    public aggregateType = 'SalesOrder';
    public eventType = 'SalesOrderLineItemRemoved';
    public timestamp = new Date();
    public metadata = {};

    constructor(
        public eventId: string,
        public aggregateId: string,
        public eventVersion: number,
        public payload: { lineId: string }
    ) {}
}

export class SalesOrderCancelled implements DomainEvent<{ reason: string }> {
    public aggregateType = 'SalesOrder';
    public eventType = 'SalesOrderCancelled';
    public timestamp = new Date();
    public metadata = {};

    constructor(
        public eventId: string,
        public aggregateId: string,
        public eventVersion: number,
        public payload: { reason: string }
    ) {}
}

export class OrderHoldApplied implements DomainEvent<{ reason: string }> {
    public aggregateType = 'SalesOrder';
    public eventType = 'OrderHoldApplied';
    public timestamp = new Date();
    public metadata = {};

    constructor(
        public eventId: string,
        public aggregateId: string,
        public eventVersion: number,
        public payload: { reason: string }
    ) {}
}

export class OrderHoldReleased implements DomainEvent<{ reason: string }> {
    public aggregateType = 'SalesOrder';
    public eventType = 'OrderHoldReleased';
    public timestamp = new Date();
    public metadata = {};

    constructor(
        public eventId: string,
        public aggregateId: string,
        public eventVersion: number,
        public payload: { reason: string }
    ) {}
}
