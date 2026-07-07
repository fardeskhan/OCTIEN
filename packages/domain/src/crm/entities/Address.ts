import { Entity } from '@cosmy/shared-kernel/src/domain/Entity';

export enum AddressType {
  BILLING = 'BILLING',
  SHIPPING = 'SHIPPING',
  WAREHOUSE = 'WAREHOUSE',
  OFFICE = 'OFFICE',
  FACTORY = 'FACTORY',
  PICKUP = 'PICKUP',
  OTHER = 'OTHER'
}

export class Address extends Entity<string> {
  constructor(
    id: string,
    public type: AddressType,
    public street1: string,
    public street2: string | null,
    public city: string,
    public stateProvince: string | null,
    public postalCode: string,
    public countryIso2: string,
    public isPrimary: boolean
  ) {
    super(id);
  }
}
