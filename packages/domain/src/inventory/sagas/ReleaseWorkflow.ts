import { AggregateRepository } from '../../../../shared/event-store/AggregateRepository';
import { ReservationAggregate } from '../aggregates/reservation/ReservationAggregate';
import { InventoryBucketAggregate } from '../aggregates/bucket/InventoryBucketAggregate';

export class ReleaseWorkflow {
  constructor(private readonly repository: AggregateRepository) {}

  public async releaseReservation(
    reservationId: string, 
    reason: string, 
    actorId: string, 
    allocatedLocations: Array<{locationId: string, productId: string, quantity: any}>
  ): Promise<void> {
    const reservation = await this.repository.load(reservationId, 'Reservation', () => new ReservationAggregate(reservationId));
    reservation.releaseReservation(reason, actorId);
    await this.repository.save(reservation);

    // Synchronously reduce the allocated pool in the buckets
    for (const alloc of allocatedLocations) {
      const bucketId = `${alloc.productId}-${alloc.locationId}`;
      const bucket = await this.repository.load(bucketId, 'InventoryBucket', () => new InventoryBucketAggregate(bucketId));
      bucket.releaseAllocation(reservationId, alloc.quantity, actorId);
      await this.repository.save(bucket);
    }
  }
}
