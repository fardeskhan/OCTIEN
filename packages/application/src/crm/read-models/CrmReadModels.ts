export interface CustomerLookupView {
  customerId: string;
  customerCode: string;
  name: string;
  status: string;
}

export interface CustomerDirectoryView {
  customerId: string;
  customerCode: string;
  name: string;
  status: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  creditLimit: number;
  creditHoldFlag: boolean;
}

export interface CustomerDetailsView {
  customerId: string;
  customerCode: string;
  name: string;
  taxId: string | null;
  website: string | null;
  status: string;
  contacts: {
    contactId: string;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    isPrimary: boolean;
  }[];
  addresses: {
    addressId: string;
    type: string;
    street1: string;
    city: string;
    stateProvince: string | null;
    postalCode: string;
    countryIso2: string;
    isPrimary: boolean;
  }[];
}

export interface CreditProfileView {
  customerId: string;
  creditLimit: number;
  creditTerms: string;
  riskRating: string;
  creditHoldFlag: boolean;
  preferredCurrency: string;
  preferredInvoiceDelivery: string;
  // This value is computed via a cross-context projection listening to Finance Ledgers
  outstandingBalance: number; 
}
