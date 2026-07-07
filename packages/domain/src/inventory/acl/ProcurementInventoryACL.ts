import { ACLContractRegistry } from './ACLContractRegistry';
import { Quantity } from '../value-objects/Quantity';

export class ProcurementInventoryACL {
  constructor(private registry: ACLContractRegistry) {
    this.registerTranslators();
  }

  private registerTranslators() {
    this.registry.registerInbound({ contractName: 'PurchaseOrderApproved', contractVersion: '1' }, (event: any) => {
      return {
        commandType: 'ExpectInventoryCommand', // Acknowledges inbound expectation
        tenantId: event.tenantId,
        correlationId: event.correlationId,
        causationId: event.eventId,
        
        productId: event.data.productId,
        destinationLocationId: event.data.receivingLocationId,
        expectedQuantity: new Quantity(event.data.orderedQuantity, event.data.uom),
        sourceContext: 'PurchaseOrder',
        sourceReferenceId: event.data.poId
      };
    });

    this.registry.registerInbound({ contractName: 'GoodsArrived', contractVersion: '1' }, (event: any) => {
      return {
        commandType: 'ReceiveInventoryCommand',
        tenantId: event.tenantId,
        correlationId: event.correlationId,
        causationId: event.eventId,
        
        productId: event.data.productId,
        locationId: event.data.receivingLocationId,
        quantity: new Quantity(event.data.receivedQuantity, event.data.uom),
        unitCost: event.data.unitCost, // Triggers cost layer creation
        receiptReference: event.data.receiptId
      };
    });
  }

  public handleProcurementEvent(contractName: string, contractVersion: string, event: any): any {
    return this.registry.translateInbound({ contractName, contractVersion }, event);
  }
}
