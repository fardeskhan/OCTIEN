import { ReservationStatus } from './ReservationStatus';
import { InventoryId } from '../value-objects/InventoryId';
import { Quantity } from '../value-objects/Quantity';
import { AggregateRoot } from '../../shared/AggregateRoot';
import { randomUUID } from 'crypto';

export class Reservation extends AggregateRoot<string> {
  private constructor(
    public readonly id: string,
    public readonly inventoryId: InventoryId,
    public readonly quantity: Quantity,
    public readonly referenceId: string, // e.g., SalesOrderId
    public readonly expiresAt: Date,
    public status: ReservationStatus
  ) {
    super();
  }

  public static create(props: {
    inventoryId: InventoryId;
    quantity: Quantity;
    referenceId: string;
    expiresAt: Date;
  }): Reservation {
    const reservation = new Reservation(
      randomUUID(),
      props.inventoryId,
      props.quantity,
      props.referenceId,
      props.expiresAt,
      ReservationStatus.ACTIVE
    );
    reservation.addDomainEvent({ type: 'Stock.Reserved', payload: { inventoryId: props.inventoryId.value, quantity: props.quantity.value } });
    return reservation;
  }

  public release(): void {
    if (this.status !== ReservationStatus.ACTIVE && this.status !== ReservationStatus.EXPIRED) {
      throw new Error("Cannot release an inactive reservation.");
    }
    this.status = ReservationStatus.RELEASED;
    this.addDomainEvent({ type: 'Stock.Released', payload: { inventoryId: this.inventoryId.value, quantity: this.quantity.value } });
  }

  public fulfill(): void {
    if (this.status !== ReservationStatus.ACTIVE) {
      throw new Error("Cannot fulfill a non-active reservation.");
    }
    this.status = ReservationStatus.FULFILLED;
  }

  /**
   * Invoked via an expiration policy or a cron job.
   */
  public expire(currentDate: Date): void {
    if (this.status === ReservationStatus.ACTIVE && currentDate > this.expiresAt) {
      this.status = ReservationStatus.EXPIRED;
      // Triggers compensation logic (returning stock to availability projection)
      this.addDomainEvent({ type: 'Stock.Released', payload: { inventoryId: this.inventoryId.value, quantity: this.quantity.value, reason: 'EXPIRED' } });
    }
  }
}
