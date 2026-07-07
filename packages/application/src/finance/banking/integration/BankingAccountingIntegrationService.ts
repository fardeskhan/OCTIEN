import { 
  BankingEvent, 
  BankTransactionPosted,
  BankTransactionType 
} from '../../../../../domain/src/finance/banking/events/BankingEvents';
import { BankingFinancialIntent, BankingIntentType } from './BankingFinancialIntent';
import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../../shared-kernel/src/finance/Currency';
import { AccountingIntegrationEvent } from '../../contracts/AccountingIntegrationEvent';

export class BankingAccountingIntegrationService {
  constructor(private postingWorker: any) {}

  public async processBankingEvent(event: BankingEvent): Promise<void> {
    const intent = this.translateToIntent(event);
    if (!intent) return; 

    const accountingEvent = this.mapIntentToIntegrationEvent(intent, event.eventId);
    
    await this.postingWorker.process(accountingEvent);
  }

  private translateToIntent(event: BankingEvent): BankingFinancialIntent | null {
    if (event instanceof BankTransactionPosted) {
      let intentType: BankingIntentType;

      switch (event.transactionType) {
        case BankTransactionType.DEPOSIT:
          intentType = BankingIntentType.BANK_DEPOSIT;
          break;
        case BankTransactionType.WITHDRAWAL:
          intentType = BankingIntentType.BANK_WITHDRAWAL;
          break;
        case BankTransactionType.FEE:
          intentType = BankingIntentType.BANK_FEE;
          break;
        case BankTransactionType.INTEREST:
          intentType = BankingIntentType.BANK_INTEREST;
          break;
        case BankTransactionType.ADJUSTMENT:
          intentType = BankingIntentType.BANK_ADJUSTMENT;
          break;
        default:
          return null; // Transfers are handled differently or not mapped directly 1:1 if internal
      }

      return new BankingFinancialIntent(
        intentType,
        event.transactionId,
        event.bankAccountId,
        new Decimal(event.amount, 2, 38), 
        new Currency(event.currency, 2),
        event.timestamp,
        event.tenantId
      );
    }
    
    return null;
  }

  private mapIntentToIntegrationEvent(intent: BankingFinancialIntent, originalEventId: string): AccountingIntegrationEvent {
    return {
      eventId: `gl-int-bnk-${originalEventId}`,
      sourceEventId: originalEventId,
      tenantId: intent.tenantId,
      subledger: 'BANKING',
      transactionType: intent.intentType,
      sourceDocumentId: intent.sourceDocumentId,
      amount: intent.amount.value,
      currency: intent.currency.code,
      postingDate: intent.postingDate
    };
  }
}
