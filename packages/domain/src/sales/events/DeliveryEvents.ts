import { DomainEvent } from '../domain/DomainEvent';

export interface DeliveryLineItem {
    lineId: string;
    productId: string;
    quantity: number;
}

export class DeliveryCompleted implements DomainEvent<{ salesOrderId: string, deliveryId: string, customerId: string, lineItems: DeliveryLineItem[] }> {
    public aggregateType = 'Delivery';
    public eventType = 'DeliveryCompleted';
    public timestamp = new Date();
    public metadata: Record<string, unknown> = {};

    constructor(
        public eventId: string,
        public aggregateId: string,
        public eventVersion: number,
        public payload: { salesOrderId: string, deliveryId: string, customerId: string, lineItems: DeliveryLineItem[] },
        public causationId: string,
        public correlationId: string
    ) {}
}

export class DeliveryPartiallyCompleted implements DomainEvent<{ salesOrderId: string, deliveryId: string, customerId: string, lineItems: DeliveryLineItem[] }> {
    public aggregateType = 'Delivery';
    public eventType = 'DeliveryPartiallyCompleted';
    public timestamp = new Date();
    public metadata: Record<string, unknown> = {};

    constructor(
        public eventId: string,
        public aggregateId: string,
        public eventVersion: number,
        public payload: { salesOrderId: string, deliveryId: string, customerId: string, lineItems: DeliveryLineItem[] },
        public causationId: string,
        public correlationId: string
    ) {}
}

export class ReturnReceived implements DomainEvent<{ salesOrderId: string, returnId: string, customerId: string, returnedItems: DeliveryLineItem[] }> {
    public aggregateType = 'Return';
    public eventType = 'ReturnReceived';
    public timestamp = new Date();
    public metadata: Record<string, unknown> = {};

    constructor(
        public eventId: string,
        public aggregateId: string,
        public eventVersion: number,
        public payload: { salesOrderId: string, returnId: string, customerId: string, returnedItems: DeliveryLineItem[] },
        public causationId: string,
        public correlationId: string
    ) {}
}
