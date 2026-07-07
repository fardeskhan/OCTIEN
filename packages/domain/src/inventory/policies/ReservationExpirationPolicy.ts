/**
 * ReservationExpirationPolicy Interface
 * Defines how long a reservation is allowed to exist before expiring for a given business/product.
 */
export interface ReservationExpirationPolicy {
  getExpirationDurationHours(businessId: string, productId: string): Promise<number>;
}
