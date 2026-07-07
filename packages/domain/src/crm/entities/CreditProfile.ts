import { Entity } from '@cosmy/shared-kernel/src/domain/Entity';
import { Money } from '@cosmy/shared-kernel/src/value-objects/Money';

export class CreditProfile extends Entity<string> {
  constructor(
    id: string,
    public creditLimit: Money,
    public creditTerms: string,
    public riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    public creditHoldFlag: boolean,
    public preferredInvoiceDelivery: 'EMAIL' | 'WHATSAPP' | 'PRINT' | 'PORTAL'
  ) {
    super(id);
  }

  public placeOnHold(): void {
    this.creditHoldFlag = true;
  }

  public releaseHold(): void {
    this.creditHoldFlag = false;
  }

  public adjustLimit(newLimit: Money): void {
    if (newLimit.isNegative()) {
      throw new Error('Credit limit cannot be negative.');
    }
    this.creditLimit = newLimit;
  }

  public updateRiskRating(rating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): void {
    this.riskRating = rating;
  }
}
