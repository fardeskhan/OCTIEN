import { Entity } from '@cosmy/shared-kernel/src/domain/Entity';
import { EmailAddress } from '../value-objects/EmailAddress';
import { PhoneNumber } from '../value-objects/PhoneNumber';

export class Contact extends Entity<string> {
  constructor(
    id: string,
    public name: string,
    public role: string | null,
    public department: string | null,
    public email: EmailAddress | null,
    public phone: PhoneNumber | null,
    public preferredContactMethod: 'EMAIL' | 'PHONE' | 'WHATSAPP' | 'OTHER',
    public isPrimary: boolean
  ) {
    super(id);
  }

  public setPrimary(primary: boolean): void {
    this.isPrimary = primary;
  }
}
