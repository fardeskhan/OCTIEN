import { Batch } from '../aggregate/Batch';
import { BatchId } from '../value-objects/BatchId';
import { ProductId } from '../value-objects/ProductId';

export interface BatchRepository {
  findById(id: BatchId): Promise<Batch | null>;
  findByProduct(productId: ProductId): Promise<Batch[]>;
  save(batch: Batch): Promise<void>;
}
