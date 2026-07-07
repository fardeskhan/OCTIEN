/**
 * NegativeInventoryPolicy Interface
 * Separates the business rule (Can this business have negative stock?) from the invariant arithmetic.
 * Implementation will reside in the application/infrastructure layer (e.g., checking platform_settings).
 */
export interface NegativeInventoryPolicy {
  allowsNegativeInventory(businessId: string): Promise<boolean>;
}
