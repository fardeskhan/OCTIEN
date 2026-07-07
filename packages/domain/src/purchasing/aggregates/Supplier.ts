import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { SupplierCreatedDomainEvent } from '../events/PurchasingDomainEvents';

export class Supplier extends AggregateRoot<string> {
  private constructor(
    id: string,
    public readonly businessId: string,
    public name: string,
    public currency: string,
    public paymentTerms: string,
    public taxRegistration: string | null,
    public isPreferred: boolean,
    public isActive: boolean
  ) {
    super(id);
  }

  public static create(
    id: string,
    businessId: string,
    name: string,
    currency: string,
    paymentTerms: string,
    taxRegistration?: string,
    isPreferred: boolean = false
  ): Supplier {
    const supplier = new Supplier(id, businessId, name, currency, paymentTerms, taxRegistration || null, isPreferred, true);
    supplier.addDomainEvent(new SupplierCreatedDomainEvent(id, name, currency));
    return supplier;
  }

  public deactivate(): void {
    this.isActive = false;
  }

  public activate(): void {
    this.isActive = true;
  }

  public setPreferred(preferred: boolean): void {
    this.isPreferred = preferred;
  }
}
