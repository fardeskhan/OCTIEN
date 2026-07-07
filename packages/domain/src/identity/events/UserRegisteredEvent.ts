import { DomainEvent } from '@cosmy/shared-kernel';

export class UserRegisteredEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly tenantId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string
  ) {
    super(aggregateId, 'Identity', 'UserRegistered');
  }
}
