import { BatchId } from '../value-objects/BatchId';
import { ProductId } from '../value-objects/ProductId';
import { BatchStatus } from './BatchStatus';
import { AggregateRoot } from '../../shared/AggregateRoot';

/**
 * Batch Aggregate Root
 * Lifecycle: Created -> Received -> Available -> Reserved / Consumed -> Closed -> Archived
 */
export class Batch extends AggregateRoot<BatchId> {
  private constructor(
    public readonly id: BatchId,
    public readonly productId: ProductId,
    public readonly businessId: string,
    public status: BatchStatus,
    public readonly attributes: Record<string, any>,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {
    super();
  }

  public static create(props: {
    productId: ProductId;
    businessId: string;
    attributes?: Record<string, any>;
  }): Batch {
    const batch = new Batch(
      BatchId.generate(),
      props.productId,
      props.businessId,
      BatchStatus.CREATED,
      props.attributes || {},
      new Date(),
      new Date()
    );
    batch.addDomainEvent({ type: 'Batch.Created', payload: { id: batch.id.value } });
    return batch;
  }

  public receive(): void {
    if (this.status !== BatchStatus.CREATED) {
      throw new Error(`Cannot receive batch in status ${this.status}`);
    }
    this.status = BatchStatus.RECEIVED;
    this.updatedAt = new Date();
  }

  public makeAvailable(): void {
    if (this.status !== BatchStatus.RECEIVED && this.status !== BatchStatus.RESERVED) {
      throw new Error(`Cannot make batch available from status ${this.status}`);
    }
    this.status = BatchStatus.AVAILABLE;
    this.updatedAt = new Date();
  }

  public close(): void {
    if (this.status === BatchStatus.CLOSED || this.status === BatchStatus.ARCHIVED) {
      throw new Error(`Batch is already closed or archived.`);
    }
    this.status = BatchStatus.CLOSED;
    this.updatedAt = new Date();
    this.addDomainEvent({ type: 'Batch.Closed', payload: { id: this.id.value } });
  }
}
