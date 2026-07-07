import { 
  AREvent, 
  ReceivableInvoiceApproved, 
  ReceiptPosted, 
  CreditNotePosted, 
  WriteOffPosted 
} from '../../../../../domain/src/finance/ar/events/AREvents';
import { ARFinancialIntent } from './ARFinancialIntent';
import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../../shared-kernel/src/finance/Currency';
// Mocking the AccountingIntegrationEvent payload structure expected by PostingWorker
import { AccountingIntegrationEvent } from '../../../contracts/AccountingIntegrationEvent'; 

export class ARAccountingIntegrationService {
  constructor(private postingWorker: any) {} // Injected PostingWorker

  public async processAREvent(event: AREvent): Promise<void> {
    const intent = this.translateToIntent(event);
    if (!intent) return; // Not an accounting-relevant event

    const accountingEvent = this.mapIntentToIntegrationEvent(intent, event.eventId);
    
    // Dispatch to GL boundary
    await this.postingWorker.process(accountingEvent);
  }

  private translateToIntent(event: AREvent): ARFinancialIntent | null {
    if (event instanceof ReceivableInvoiceApproved) {
      return new ARFinancialIntent(
        'SALE',
        event.invoiceId,
        event.customerId,
        new Decimal(event.amount, 2, 38), // Mocking scale/precision for brevity
        new Currency(event.currency, 2),
        event.timestamp,
        event.tenantId
      );
    }
    
    if (event instanceof ReceiptPosted) {
      return new ARFinancialIntent(
        'PAYMENT',
        event.receiptId,
        event.customerId,
        new Decimal(event.amount, 2, 38),
        new Currency(event.currency, 2),
        event.timestamp,
        event.tenantId
      );
    }

    if (event instanceof CreditNotePosted) {
      return new ARFinancialIntent(
        'RETURN',
        event.creditNoteId,
        event.customerId,
        new Decimal(event.amount, 2, 38),
        new Currency('USD', 2), // Hardcoded currency for brevity in mockup
        event.timestamp,
        event.tenantId
      );
    }

    if (event instanceof WriteOffPosted) {
      return new ARFinancialIntent(
        'WRITE_OFF',
        event.writeOffId,
        'N/A', // Customer ID might require lookup in real system
        new Decimal(event.amount, 2, 38),
        new Currency('USD', 2),
        event.timestamp,
        event.tenantId
      );
    }

    return null;
  }

  private mapIntentToIntegrationEvent(intent: ARFinancialIntent, originalEventId: string): AccountingIntegrationEvent {
    // This creates the standard contract payload accepted by the Posting Engine
    return {
      eventId: `gl-int-${originalEventId}`,
      sourceEventId: originalEventId, // Serves as PostingIdempotencyKey
      tenantId: intent.tenantId,
      subledger: 'AR',
      transactionType: intent.intentType,
      sourceDocumentId: intent.sourceDocumentId,
      amount: intent.amount.value,
      currency: intent.currency.code,
      postingDate: intent.postingDate
    };
  }
}
