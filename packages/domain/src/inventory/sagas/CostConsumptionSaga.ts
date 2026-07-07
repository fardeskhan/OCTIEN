import { DomainEvent } from '../../../../shared/DomainEvent';
import { AggregateRepository } from '../../../../shared/event-store/AggregateRepository';
import { ConcurrencyConflictException } from '../../../../shared/event-store/ConcurrencyConflictException';
import { CostLayerAggregate } from '../aggregates/costlayer/CostLayerAggregate';
import { CostingPolicy, CostLayerRecord } from '../services/CostingPolicy';

export class CostConsumptionSaga {
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY_MS = 100;

  constructor(
    private readonly repository: AggregateRepository,
    private readonly policy: CostingPolicy,
    private readonly availableLayersFetcher: (productId: string, locationId: string) => Promise<CostLayerRecord[]>
  ) {}

  public async onStockMoved(event: DomainEvent<any>): Promise<void> {
    const payload = event.payload;
    if (!payload.fromLocationId) return; // Only process dispatches

    let attempt = 0;
    while (attempt <= this.MAX_RETRIES) {
      try {
        await this.tryConsume(payload.productId, payload.fromLocationId, payload.quantity, payload.movementId, event.actorId);
        return; // Success
      } catch (error) {
        if (error instanceof ConcurrencyConflictException) {
          attempt++;
          if (attempt > this.MAX_RETRIES) {
            throw new Error(`Exhausted retries in CostConsumptionSaga for movement ${payload.movementId}`);
          }
          const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }

  private async tryConsume(productId: string, locationId: string, quantity: any, movementId: string, actorId: string): Promise<void> {
    const availableLayers = await this.availableLayersFetcher(productId, locationId);
    const plan = this.policy.createConsumptionPlan(quantity, availableLayers);

    if (!plan.fulfilled) {
      throw new Error(`Cannot fulfill cost consumption: Insufficient cost layers for ${productId} at ${locationId}`);
    }

    for (const alloc of plan.consumptions) {
      const layer = await this.repository.load(alloc.layerId, 'CostLayer', () => new CostLayerAggregate(alloc.layerId));
      layer.consumeCostLayer(alloc.quantity, movementId, actorId);
      await this.repository.save(layer);
    }
  }
}
