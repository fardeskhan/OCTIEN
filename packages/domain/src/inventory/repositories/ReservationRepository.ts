import { Reservation } from '../entities/Reservation';
import { InventoryId } from '../value-objects/InventoryId';

export interface ReservationRepository {
  findById(id: string): Promise<Reservation | null>;
  findActiveByInventory(inventoryId: InventoryId): Promise<Reservation[]>;
  save(reservation: Reservation): Promise<void>;
}
