import { AssetFinancialIntent, AssetFinancialIntentType } from '../../../../domain/src/finance/assets/acl/AssetFinancialIntent';
import { AssetCapitalized, DepreciationExpenseCalculated, AssetDisposed, AssetImpaired, AssetTransferred } from '../../../../domain/src/finance/assets/events/AssetEvents';
import { AccountingIntegrationEvent } from '../../contracts/AccountingIntegrationEvent';
import { AssetCategoryAccountMapping } from '../../../../domain/src/finance/assets/aggregates/AssetCategoryAccountMapping';

export class AssetAccountingIntegrationService {

  public translateCapitalizationToIntent(event: AssetCapitalized): AssetFinancialIntent {
    return new AssetFinancialIntent(
      `intent-${event.eventId}`,
      event.tenantId,
      AssetFinancialIntentType.ASSET_CAPITALIZATION,
      event.assetId,
      event.assetClassId,
      event.cost,
      event.timestamp
    );
  }

  public translateDepreciationToIntent(event: DepreciationExpenseCalculated): AssetFinancialIntent {
    return new AssetFinancialIntent(
      `intent-${event.eventId}`,
      event.tenantId,
      AssetFinancialIntentType.DEPRECIATION_EXPENSE,
      event.assetId,
      event.assetClassId,
      event.expenseAmount,
      event.timestamp
    );
  }

  public translateDisposalToIntent(event: AssetDisposed): AssetFinancialIntent {
    return new AssetFinancialIntent(
      `intent-${event.eventId}`,
      event.tenantId,
      AssetFinancialIntentType.ASSET_DISPOSAL,
      event.assetId,
      event.assetClassId,
      event.gainOrLossAmount, // Simplification for intent payload
      event.timestamp
    );
  }
  
  public translateImpairmentToIntent(event: AssetImpaired): AssetFinancialIntent {
    return new AssetFinancialIntent(
      `intent-${event.eventId}`,
      event.tenantId,
      AssetFinancialIntentType.IMPAIRMENT_LOSS,
      event.assetId,
      event.assetClassId,
      event.impairmentAmount,
      event.timestamp
    );
  }

  public generateAccountingEvent(
    intent: AssetFinancialIntent,
    mapping: AssetCategoryAccountMapping
  ): AccountingIntegrationEvent {
    // In a real system, the accounting event would carry the specific GL accounts resolved from the mapping.
    // For this bounded context boundary, we map it into the abstract AccountingIntegrationEvent.
    return new AccountingIntegrationEvent(
      `evt-${intent.intentId}`,
      intent.tenantId,
      intent.timestamp,
      'FIXED_ASSETS',
      intent.intentType,
      intent.financialAmount,
      'USD'
    );
  }
}
