import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';

export class BusinessCreatedDomainEvent extends DomainEvent {
  constructor(public readonly businessId: string) { super(); }
}

export class BusinessActivatedDomainEvent extends DomainEvent {
  constructor(public readonly businessId: string) { super(); }
}

export class BusinessSuspendedDomainEvent extends DomainEvent {
  constructor(public readonly businessId: string) { super(); }
}

export enum BusinessState {
  CREATED = 'CREATED',
  CONFIGURING = 'CONFIGURING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED'
}

export class Business extends AggregateRoot<string> {
  private constructor(
    id: string,
    public name: string,
    public branding: { logoUrl?: string; themeColor?: string },
    public timezone: string,
    public defaultCurrency: string,
    public taxConfigurationId: string | null,
    public state: BusinessState
  ) {
    super(id);
  }

  public static create(
    id: string,
    name: string,
    timezone: string,
    defaultCurrency: string
  ): Business {
    const business = new Business(id, name, {}, timezone, defaultCurrency, null, BusinessState.CREATED);
    business.addDomainEvent(new BusinessCreatedDomainEvent(id));
    return business;
  }

  public startConfiguration(): void {
    if (this.state !== BusinessState.CREATED) throw new Error('Invalid state transition');
    this.state = BusinessState.CONFIGURING;
  }

  public activate(): void {
    if (this.state !== BusinessState.CONFIGURING && this.state !== BusinessState.SUSPENDED) {
      throw new Error('Invalid state transition');
    }
    this.state = BusinessState.ACTIVE;
    this.addDomainEvent(new BusinessActivatedDomainEvent(this.id));
  }

  public suspend(): void {
    this.state = BusinessState.SUSPENDED;
    this.addDomainEvent(new BusinessSuspendedDomainEvent(this.id));
  }
}
