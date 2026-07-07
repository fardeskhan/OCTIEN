import { Projection, ProjectionEvent } from '../../../../../platform-runtime/src/cqrs/Projection';

export class CreditExposureProjection implements Projection {
  private currentVersion = 1;

  name(): string { return 'CreditExposureProjection'; }
  version(): number { return this.currentVersion; }

  async apply(event: ProjectionEvent): Promise<void> {
    // Listens to:
    // ReceivableInvoiceApproved (increases exposure)
    // InvoiceAllocationCreated (decreases exposure)
    // 
    // This allows the root CustomerAccount credit limit validation to quickly fetch the exact real-time exposure
    // accounting for both posted AND approved-but-unposted invoices.
  }

  async replay(events: ProjectionEvent[]): Promise<void> {
    for (const event of events) await this.apply(event);
  }

  async reset(): Promise<void> {
    // TRUNCATE TABLE read_ar_credit_exposure;
  }

  async checkpoint(): Promise<void> {}
}
