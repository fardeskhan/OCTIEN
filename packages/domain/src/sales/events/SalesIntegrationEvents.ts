// Sales Integration Events mapping to the Event Choreography architecture
import { IntegrationEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';

export class OrderConfirmedIntegrationEvent implements IntegrationEvent {
  public readonly eventName = 'Sales.OrderConfirmed';
  constructor(
    public readonly orderId: string,
    public readonly businessId: string,
    public readonly customerId: string,
    public readonly lines: { productId: string; quantity: number }[]
  ) {}
}

export class ShipmentDispatchedIntegrationEvent implements IntegrationEvent {
  public readonly eventName = 'Sales.ShipmentDispatched';
  constructor(
    public readonly shipmentId: string,
    public readonly orderId: string,
    public readonly warehouseId: string,
    public readonly carrier: string
  ) {}
}

export class InvoiceIssuedIntegrationEvent implements IntegrationEvent {
  public readonly eventName = 'Sales.InvoiceIssued';
  constructor(
    public readonly invoiceId: string,
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly totalAmount: number,
    public readonly currency: string,
    public readonly dueDate: Date
  ) {}
}

export class InvoiceGenerationRequestedIntegrationEvent implements IntegrationEvent {
  public readonly eventName = 'Sales.InvoiceGenerationRequested';
  constructor(
    public readonly orderId: string,
    public readonly shipmentId: string,
    public readonly shippedLines: { productId: string; shippedQuantity: number }[]
  ) {}
}
