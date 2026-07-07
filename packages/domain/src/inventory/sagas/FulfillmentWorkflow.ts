import { DomainEvent } from '../../../../shared/DomainEvent';
import { AggregateRepository } from '../../../../shared/event-store/AggregateRepository';
import { ReservationAggregate } from '../aggregates/reservation/ReservationAggregate';

export class FulfillmentWorkflow {
  constructor(private readonly repository: AggregateRepository) {}

  // Triggered by StockMoved event (when physical truth confirms dispatch)
  public async onStockMoved(event: DomainEvent<any>): Promise<void> {
    const payload = event.payload;
    if (!payload.reservationId) return; // Not tied to a reservation

    const reservation = await this.repository.load(payload.reservationId, 'Reservation', () => new ReservationAggregate(payload.reservationId));
    reservation.fulfillReservation(payload.quantity, payload.movementId, event.actorId);
    await this.repository.save(reservation);
  }
}
