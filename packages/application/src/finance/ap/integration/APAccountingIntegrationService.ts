import { 
  APEvent, 
  PayableInvoiceApproved, 
  PaymentPosted, 
  DebitNotePosted, 
  VendorWriteOffPosted 
} from '../../../../../domain/src/finance/ap/events/APEvents';
import { APFinancialIntent } from './APFinancialIntent';
import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../../shared-kernel/src/finance/Currency';
import { AccountingIntegrationEvent } from '../../contracts/AccountingIntegrationEvent'; 

export class APAccountingIntegrationService {
  constructor(private postingWorker: any) {}

  public async processAPEvent(event: APEvent): Promise<void> {
    const intent = this.translateToIntent(event);
    if (!intent) return; 

    const accountingEvent = this.mapIntentToIntegrationEvent(intent, event.eventId);
    
    await this.postingWorker.process(accountingEvent);
  }

  private translateToIntent(event: APEvent): APFinancialIntent | null {
    if (event instanceof PayableInvoiceApproved) {
      return new APFinancialIntent(
        'PURCHASE',
        event.invoiceId,
        event.vendorId,
        new Decimal(event.amount, 2, 38), 
        new Currency(event.currency, 2),
        event.timestamp,
        event.tenantId
      );
    }
    
    if (event instanceof PaymentPosted) {
      return new APFinancialIntent(
        'PAYMENT',
        event.paymentId,
        event.vendorId,
        new Decimal(event.amount, 2, 38),
        new Currency(event.currency, 2),
        event.timestamp,
        event.tenantId
      );
    }

    if (event instanceof DebitNotePosted) {
      return new APFinancialIntent(
        'PURCHASE_RETURN',
        event.debitNoteId,
        event.vendorId,
        new Decimal(event.amount, 2, 38),
        new Currency('USD', 2),
        event.timestamp,
        event.tenantId
      );
    }

    if (event instanceof VendorWriteOffPosted) {
      return new APFinancialIntent(
        'VENDOR_WRITE_OFF',
        event.writeOffId,
        event.vendorId,
        new Decimal(event.amount, 2, 38),
        new Currency('USD', 2),
        event.timestamp,
        event.tenantId
      );
    }

    return null;
  }

  private mapIntentToIntegrationEvent(intent: APFinancialIntent, originalEventId: string): AccountingIntegrationEvent {
    return {
      eventId: `gl-int-ap-${originalEventId}`,
      sourceEventId: originalEventId,
      tenantId: intent.tenantId,
      subledger: 'AP',
      transactionType: intent.intentType,
      sourceDocumentId: intent.sourceDocumentId,
      amount: intent.amount.value,
      currency: intent.currency.code,
      postingDate: intent.postingDate
    };
  }
}
