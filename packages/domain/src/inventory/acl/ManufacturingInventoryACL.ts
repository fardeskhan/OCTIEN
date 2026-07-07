import { ACLContractRegistry } from './ACLContractRegistry';
import { Quantity } from '../value-objects/Quantity';

export class ManufacturingInventoryACL {
  constructor(private registry: ACLContractRegistry) {
    this.registerTranslators();
  }

  private registerTranslators() {
    this.registry.registerInbound({ contractName: 'ProductionStarted', contractVersion: '1' }, (event: any) => {
      return {
        commandType: 'ReserveInventoryCommand',
        tenantId: event.tenantId,
        correlationId: event.correlationId,
        causationId: event.eventId,
        
        productId: event.data.rawMaterialId,
        sourceLocationId: event.data.productionLocationId,
        requestedQuantity: new Quantity(event.data.requiredQuantity, event.data.uom),
        sourceContext: 'ManufacturingOrder',
        sourceReferenceId: event.data.productionOrderId
      };
    });

    this.registry.registerInbound({ contractName: 'ProductionCompleted', contractVersion: '1' }, (event: any) => {
      return {
        commandType: 'ReceiveFinishedGoodsCommand',
        tenantId: event.tenantId,
        correlationId: event.correlationId,
        causationId: event.eventId,
        
        productId: event.data.finishedGoodId,
        locationId: event.data.productionLocationId,
        quantity: new Quantity(event.data.producedQuantity, event.data.uom),
        unitCost: event.data.calculatedCost,
        receiptReference: event.data.productionOrderId
      };
    });
  }

  public handleManufacturingEvent(contractName: string, contractVersion: string, event: any): any {
    return this.registry.translateInbound({ contractName, contractVersion }, event);
  }
}
