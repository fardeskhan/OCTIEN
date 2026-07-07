export enum PartyType {
  Customer = 'Customer',
  Vendor = 'Vendor',
  Employee = 'Employee',
  Bank = 'Bank',
  Government = 'Government',
  Company = 'Company',
  Individual = 'Individual',
  Other = 'Other'
}

export enum PartyRole {
  BillTo = 'BillTo',
  ShipTo = 'ShipTo',
  PayTo = 'PayTo',
  SoldTo = 'SoldTo',
  Beneficiary = 'Beneficiary',
  Remitter = 'Remitter',
  TaxAuthority = 'TaxAuthority'
}

export interface AccountingParty {
  partyId: string;
  partyType: PartyType;
  displayName: string;
  taxIdentifier?: string;
  registrationNumber?: string;
  countryCode?: string;
  currency?: string;
  role: PartyRole;
}
