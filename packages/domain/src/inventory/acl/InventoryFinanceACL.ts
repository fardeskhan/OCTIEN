import { ACLContractRegistry } from './ACLContractRegistry';

export class InventoryFinanceACL {
  constructor(private registry: ACLContractRegistry) {
    this.registerTranslators();
  }

  private registerTranslators() {
    this.registry.registerOutbound({ contractName: 'CostLayerConsumed', contractVersion: '1' }, (event: any) => {
      // Outbound ACL translation: Converts Inventory internal fact into Finance intent
      return {
        intent: 'CreateCOGSPosting',
        tenantId: event.tenantId,
        correlationId: event.correlationId,
        causationId: event.eventId,
        
        data: {
          inventoryAssetCredit: event.payload.monetaryValue,
          cogsDebit: event.payload.monetaryValue,
          productId: event.payload.productId,
          transactionDate: event.timestamp
        }
      };
    });

    this.registry.registerOutbound({ contractName: 'CostLayerAdjusted', contractVersion: '1' }, (event: any) => {
      return {
        intent: 'UpdateInventoryAsset',
        tenantId: event.tenantId,
        correlationId: event.correlationId,
        causationId: event.eventId,
        
        data: {
          assetAdjustmentAmount: event.payload.costAdjustmentTotal,
          productId: event.payload.productId,
          reason: event.payload.reason,
          transactionDate: event.timestamp
        }
      };
    });
  }

  public translateInventoryFactToFinance(contractName: string, contractVersion: string, event: any): any {
    return this.registry.translateOutbound({ contractName, contractVersion }, event);
  }
}
