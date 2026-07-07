import { ACLContractRegistry } from './ACLContractRegistry';
import { Quantity } from '../value-objects/Quantity';

export class SalesInventoryACL {
  constructor(private registry: ACLContractRegistry) {
    this.registerTranslators();
  }

  private registerTranslators() {
    this.registry.registerInbound({ contractName: 'SalesOrderConfirmed', contractVersion: '1' }, (event: any) => {
      // Translates SalesOrderConfirmed to CreateReservation Command
      return {
        commandType: 'CreateReservationCommand',
        tenantId: event.tenantId,
        correlationId: event.correlationId,
        causationId: event.eventId, // CAUSATION chaining
        
        productId: event.data.productId,
        sourceLocationId: event.data.fulfillmentLocationId,
        requestedQuantity: new Quantity(event.data.orderedQuantity, event.data.uom),
        sourceContext: 'SalesOrder',
        sourceReferenceId: event.data.orderId
      };
    });

    this.registry.registerInbound({ contractName: 'OrderCancelled', contractVersion: '1' }, (event: any) => {
      return {
        commandType: 'ReleaseReservationCommand',
        tenantId: event.tenantId,
        correlationId: event.correlationId,
        causationId: event.eventId,
        
        reservationId: event.data.reservationId,
        reason: 'Order Cancelled'
      };
    });

    this.registry.registerInbound({ contractName: 'DeliveryCompleted', contractVersion: '1' }, (event: any) => {
      return {
        commandType: 'DispatchInventoryCommand',
        tenantId: event.tenantId,
        correlationId: event.correlationId,
        causationId: event.eventId,
        
        reservationId: event.data.reservationId,
        productId: event.data.productId,
        quantity: new Quantity(event.data.deliveredQuantity, event.data.uom)
      };
    });
  }

  public handleSalesEvent(contractName: string, contractVersion: string, event: any): any {
    return this.registry.translateInbound({ contractName, contractVersion }, event);
  }
}
