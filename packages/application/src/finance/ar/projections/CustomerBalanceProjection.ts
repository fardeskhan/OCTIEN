import { Projection, ProjectionEvent } from '../../../../../platform-runtime/src/cqrs/Projection';

export class CustomerBalanceProjection implements Projection {
  private currentVersion = 1;

  name(): string { return 'CustomerBalanceProjection'; }
  version(): number { return this.currentVersion; }

  async apply(event: ProjectionEvent): Promise<void> {
    // 1. Receives `ReceivableInvoicePosted`, `InvoiceAllocationCreated`, `InvoiceAllocationReversed`, `WriteOffPosted`
    // 2. Increments/Decrements standard Outstanding Balance by CustomerId and Currency
  }

  async replay(events: ProjectionEvent[]): Promise<void> {
    for (const event of events) await this.apply(event);
  }

  async reset(): Promise<void> {
    // TRUNCATE TABLE read_ar_customer_balances;
  }

  async checkpoint(): Promise<void> {}
}
