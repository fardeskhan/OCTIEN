import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { Contact } from '../entities/Contact';
import { Address } from '../entities/Address';
import { CreditProfile } from '../entities/CreditProfile';
import { 
  CustomerCreatedDomainEvent, 
  CustomerActivatedDomainEvent, 
  CustomerSuspendedDomainEvent,
  CustomerArchivedDomainEvent,
  CreditProfileChangedDomainEvent,
  ContactAddedDomainEvent,
  ContactUpdatedDomainEvent,
  ContactRemovedDomainEvent,
  AddressAddedDomainEvent,
  AddressUpdatedDomainEvent,
  AddressRemovedDomainEvent
} from '../events/CrmDomainEvents';
import { Money } from '@cosmy/shared-kernel/src/value-objects/Money';

export enum CustomerState {
  PROSPECT = 'PROSPECT',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export class Customer extends AggregateRoot<string> {
  private contacts: Contact[] = [];
  private addresses: Address[] = [];
  
  private constructor(
    id: string,
    public readonly businessId: string,
    public readonly code: string,
    public name: string,
    public readonly taxId: string | null,
    public readonly website: string | null,
    public readonly preferredCurrency: string,
    public state: CustomerState,
    public creditProfile: CreditProfile | null
  ) {
    super(id);
  }

  public static create(
    id: string,
    businessId: string,
    code: string,
    name: string,
    preferredCurrency: string,
    taxId?: string,
    website?: string
  ): Customer {
    const customer = new Customer(id, businessId, code, name, taxId || null, website || null, preferredCurrency, CustomerState.PROSPECT, null);
    customer.addDomainEvent(new CustomerCreatedDomainEvent(id));
    return customer;
  }

  public addContact(contact: Contact): void {
    if (contact.isPrimary) {
      this.contacts.forEach(c => c.setPrimary(false));
    }
    this.contacts.push(contact);
    this.addDomainEvent(new ContactAddedDomainEvent(this.id, contact.id));
  }

  public updateContact(contactId: string, updates: Partial<Contact>): void {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) throw new Error('Contact not found');
    
    if (updates.isPrimary) {
      this.contacts.forEach(c => c.setPrimary(false));
    }
    Object.assign(contact, updates);
    this.addDomainEvent(new ContactUpdatedDomainEvent(this.id, contact.id));
  }

  public removeContact(contactId: string): void {
    this.contacts = this.contacts.filter(c => c.id !== contactId);
    this.addDomainEvent(new ContactRemovedDomainEvent(this.id, contactId));
  }

  public getContacts(): Contact[] { return [...this.contacts]; }

  public addAddress(address: Address): void {
    this.addresses.push(address);
    this.addDomainEvent(new AddressAddedDomainEvent(this.id, address.id));
  }

  public updateAddress(addressId: string, updates: Partial<Address>): void {
    const address = this.addresses.find(a => a.id === addressId);
    if (!address) throw new Error('Address not found');
    Object.assign(address, updates);
    this.addDomainEvent(new AddressUpdatedDomainEvent(this.id, address.id));
  }

  public removeAddress(addressId: string): void {
    this.addresses = this.addresses.filter(a => a.id !== addressId);
    this.addDomainEvent(new AddressRemovedDomainEvent(this.id, addressId));
  }

  public getAddresses(): Address[] { return [...this.addresses]; }

  public assignCreditProfile(profile: CreditProfile): void {
    this.creditProfile = profile;
    this.addDomainEvent(new CreditProfileChangedDomainEvent(this.id));
  }

  public activate(): void {
    if (this.state !== CustomerState.PROSPECT && this.state !== CustomerState.SUSPENDED && this.state !== CustomerState.INACTIVE) {
      throw new Error(`Cannot activate customer from state ${this.state}`);
    }
    this.state = CustomerState.ACTIVE;
    this.addDomainEvent(new CustomerActivatedDomainEvent(this.id));
  }

  public suspend(): void {
    if (this.state !== CustomerState.ACTIVE) {
      throw new Error(`Only active customers can be suspended.`);
    }
    this.state = CustomerState.SUSPENDED;
    this.addDomainEvent(new CustomerSuspendedDomainEvent(this.id));
  }

  public archive(): void {
    this.state = CustomerState.ARCHIVED;
    this.addDomainEvent(new CustomerArchivedDomainEvent(this.id));
  }
}
