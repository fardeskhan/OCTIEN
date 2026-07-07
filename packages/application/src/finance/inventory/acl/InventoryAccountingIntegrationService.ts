import { InventoryFinancialIntent, InventoryFinancialIntentType } from '../../../../domain/src/finance/inventory/acl/InventoryFinancialIntent';
import { InventoryValuationCalculated } from '../../../../domain/src/finance/inventory/events/InventoryEvents';
import { AccountingIntegrationEvent } from '../../contracts/AccountingIntegrationEvent';
import { InventoryTransactionType } from '../../../../domain/src/finance/inventory/aggregates/InventoryTransactionType';

export class InventoryAccountingIntegrationService {
  
  public translateValuationToIntent(
    event: InventoryValuationCalculated,
    transactionType: InventoryTransactionType
  ): InventoryFinancialIntent {
    let intentType: InventoryFinancialIntentType;
    
    switch (transactionType) {
      case InventoryTransactionType.RECEIPT:
      case InventoryTransactionType.RETURN_IN:
        intentType = InventoryFinancialIntentType.INVENTORY_RECEIPT;
        break;
      case InventoryTransactionType.DISPATCH:
      case InventoryTransactionType.RETURN_OUT:
        intentType = InventoryFinancialIntentType.INVENTORY_DISPATCH;
        break;
      case InventoryTransactionType.ADJUSTMENT:
        intentType = InventoryFinancialIntentType.INVENTORY_ADJUSTMENT;
        break;
      case InventoryTransactionType.TRANSFER:
        intentType = InventoryFinancialIntentType.INVENTORY_TRANSFER;
        break;
      default:
        throw new Error(`Unsupported transaction type: ${transactionType}`);
    }

    return new InventoryFinancialIntent(
      `intent-${event.eventId}`,
      event.tenantId,
      intentType,
      event.transactionId,
      event.totalCost,
      event.timestamp
    );
  }

  public generateAccountingEvent(intent: InventoryFinancialIntent): AccountingIntegrationEvent {
    return new AccountingIntegrationEvent(
      `evt-${intent.intentId}`,
      intent.tenantId,
      intent.timestamp,
      'INVENTORY',
      intent.intentType,
      intent.totalCost,
      'USD'
    );
  }
}
