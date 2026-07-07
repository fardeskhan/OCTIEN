import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { BusinessCreated, BusinessUpdated } from '../events';

export class Business extends AggregateRoot<string> {
  private constructor(
    id: string,
    public name: string,
    public defaultCurrency: string,
    public timezone: string,
    public isActive: boolean
  ) {
    super(id);
  }

  public static create(id: string, name: string, defaultCurrency: string, timezone: string): Business {
    const business = new Business(id, name, defaultCurrency, timezone, true);
    business.addDomainEvent(new BusinessCreated(id));
    return business;
  }

  public updateProfile(name: string, timezone: string): void {
    this.name = name;
    this.timezone = timezone;
    this.addDomainEvent(new BusinessUpdated(this.id));
  }

  // Factory method used by Repositories to reconstruct state from database without triggering events
  public static reconstitute(id: string, name: string, defaultCurrency: string, timezone: string, isActive: boolean): Business {
    return new Business(id, name, defaultCurrency, timezone, isActive);
  }
}
