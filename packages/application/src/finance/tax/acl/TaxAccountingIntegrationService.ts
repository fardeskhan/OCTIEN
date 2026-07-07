import { TaxFinancialIntent, TaxFinancialIntentType } from '../../../../domain/src/finance/tax/acl/TaxFinancialIntent';
import { TaxDetermined } from '../../../../domain/src/finance/tax/events/TaxEvents';
import { AccountingIntegrationEvent } from '../../contracts/AccountingIntegrationEvent';

export class TaxAccountingIntegrationService {
  
  public translateTaxToIntent(
    event: TaxDetermined,
    isInputTax: boolean
  ): TaxFinancialIntent {
    
    const intentType = isInputTax ? TaxFinancialIntentType.INPUT_TAX : TaxFinancialIntentType.OUTPUT_TAX;

    return new TaxFinancialIntent(
      `intent-${event.eventId}`,
      event.tenantId,
      intentType,
      event.sourceDocumentId,
      event.totalTaxAmount,
      event.timestamp
    );
  }

  public generateAccountingEvent(intent: TaxFinancialIntent): AccountingIntegrationEvent {
    return new AccountingIntegrationEvent(
      `evt-${intent.intentId}`,
      intent.tenantId,
      intent.timestamp,
      'TAX',
      intent.intentType,
      intent.totalTaxAmount,
      'USD' // Multi-currency handling in the future
    );
  }
}
