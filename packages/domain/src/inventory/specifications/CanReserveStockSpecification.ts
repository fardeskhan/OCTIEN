import { InventoryBalance } from '../projections/InventoryBalance';
import { Quantity } from '../value-objects/Quantity';
import { NegativeInventoryPolicy } from '../policies/NegativeInventoryPolicy';

/**
 * CanReserveStockSpecification
 * A reusable domain specification evaluated by Application Services before dispatching commands.
 */
export class CanReserveStockSpecification {
  constructor(private readonly negativeInventoryPolicy: NegativeInventoryPolicy) {}

  public async isSatisfiedBy(
    businessId: string,
    balance: InventoryBalance, 
    requestedQuantity: Quantity
  ): Promise<boolean> {
    
    const available = balance.currentAvailable;
    
    // Check dynamic policy configuration
    const allowsNegative = await this.negativeInventoryPolicy.allowsNegativeInventory(businessId);
    
    if (allowsNegative) {
      return true; // Business is configured to allow backorders/negative reservations
    }

    return available >= requestedQuantity.value;
  }
}
