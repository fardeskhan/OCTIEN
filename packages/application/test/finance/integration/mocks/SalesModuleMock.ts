import { ReceivableInvoiceApproved } from '../../../../../domain/src/finance/ar/events/AREvents';

export class SalesModuleMock {
  constructor(private eventBus: any) {}

  public async createAndApproveInvoice(invoiceId: string, customerId: string, amount: string, tenantId: string): Promise<void> {
    // 1. Emulates the Sales Module performing Quote -> Order -> Invoice
    // 2. Emits the boundary event expected by AR
    
    const event = new ReceivableInvoiceApproved(
      `evt-${invoiceId}`,
      tenantId,
      new Date().toISOString(),
      invoiceId,
      customerId,
      amount,
      'USD'
    );

    // Emulate event bus dispatching to ARAccountingIntegrationService
    await this.eventBus.dispatch(event);
  }
}
