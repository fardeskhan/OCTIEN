import { PayableInvoiceApproved } from '../../../../../domain/src/finance/ap/events/APEvents';

export class PurchaseModuleMock {
  constructor(private eventBus: any) {}

  public async approvePayableInvoice(invoiceId: string, vendorId: string, amount: string, tenantId: string): Promise<void> {
    const event = new PayableInvoiceApproved(
      `evt-ap-${invoiceId}`,
      tenantId,
      new Date().toISOString(),
      invoiceId,
      vendorId,
      amount,
      'USD'
    );
    await this.eventBus.dispatch(event);
  }
}
