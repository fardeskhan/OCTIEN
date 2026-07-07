import { DomainEvent } from '../../../../shared/DomainEvent';
import { AggregateRepository } from '../../../../shared/event-store/AggregateRepository';
import { ConcurrencyConflictException } from '../../../../shared/event-store/ConcurrencyConflictException';
import { ReservationAggregate } from '../aggregates/reservation/ReservationAggregate';
import { InventoryBucketAggregate } from '../aggregates/bucket/InventoryBucketAggregate';
import { ReservationPolicy, AllocationRequest, InventoryContext } from '../services/ReservationPolicy';

export class ReservationAllocationSaga {
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY_MS = 100;

  constructor(
    private readonly repository: AggregateRepository,
    private readonly policy: ReservationPolicy,
    private readonly inventoryContextFetcher: (productId: string) => Promise<InventoryContext>
  ) {}

  public async onReservationCreated(event: DomainEvent<any>): Promise<void> {
    const payload = event.payload;
    const request: AllocationRequest = {
      reservationId: payload.reservationId,
      productId: payload.productId,
      requestedQuantity: payload.requestedQuantity
    };

    let attempt = 0;
    while (attempt <= this.MAX_RETRIES) {
      try {
        await this.tryAllocate(request, event.actorId);
        return; // Success
      } catch (error) {
        if (error instanceof ConcurrencyConflictException) {
          attempt++;
          if (attempt > this.MAX_RETRIES) {
            // Exhausted retries
            await this.markAllocationFailed(request.reservationId, event.actorId);
            return;
          }
          // Exponential backoff
          const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Unexpected error, fail or dead-letter
          await this.markAllocationFailed(request.reservationId, event.actorId);
          throw error;
        }
      }
    }
  }

  private async tryAllocate(request: AllocationRequest, actorId: string): Promise<void> {
    const context = await this.inventoryContextFetcher(request.productId);
    const plan = this.policy.allocate(request, context);

    if (plan.allocations.length === 0) {
      // Nothing to allocate
      return;
    }

    // 1. Reserve in buckets (with optimistic concurrency check natively inside save())
    for (const alloc of plan.allocations) {
      const bucketId = `${request.productId}-${alloc.locationId}`;
      const bucket = await this.repository.load(bucketId, 'InventoryBucket', () => new InventoryBucketAggregate(bucketId));
      bucket.reserveAllocation(request.reservationId, alloc.quantity, actorId);
      await this.repository.save(bucket);
    }

    // 2. Mark reservation as allocated
    let totalAllocated = plan.allocations[0].quantity;
    for (let i = 1; i < plan.allocations.length; i++) {
      totalAllocated = totalAllocated.add(plan.allocations[i].quantity);
    }

    const reservation = await this.repository.load(request.reservationId, 'Reservation', () => new ReservationAggregate(request.reservationId));
    reservation.allocateReservation(totalAllocated, actorId);
    await this.repository.save(reservation);
  }

  private async markAllocationFailed(reservationId: string, actorId: string): Promise<void> {
    const reservation = await this.repository.load(reservationId, 'Reservation', () => new ReservationAggregate(reservationId));
    reservation.releaseReservation('ALLOCATION_FAILED', actorId);
    await this.repository.save(reservation);
  }
}
