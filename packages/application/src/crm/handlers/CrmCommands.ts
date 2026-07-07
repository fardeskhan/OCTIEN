export class CreateCustomerCommand {
  constructor(
    public readonly businessId: string,
    public readonly code: string,
    public readonly name: string,
    public readonly preferredCurrency: string,
    public readonly taxId?: string,
    public readonly website?: string
  ) {}
}

export class UpdateCustomerCommand {
  constructor(
    public readonly customerId: string,
    public readonly name: string,
    public readonly taxId?: string,
    public readonly website?: string
  ) {}
}

export class ArchiveCustomerCommand {
  constructor(public readonly customerId: string) {}
}

export class AddContactCommand {
  constructor(
    public readonly customerId: string,
    public readonly name: string,
    public readonly role: string | null,
    public readonly department: string | null,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly preferredContactMethod: 'EMAIL' | 'PHONE' | 'WHATSAPP' | 'OTHER',
    public readonly isPrimary: boolean
  ) {}
}

export class UpdateContactCommand {
  constructor(
    public readonly customerId: string,
    public readonly contactId: string,
    public readonly updates: {
      name?: string;
      role?: string | null;
      department?: string | null;
      email?: string | null;
      phone?: string | null;
      preferredContactMethod?: 'EMAIL' | 'PHONE' | 'WHATSAPP' | 'OTHER';
      isPrimary?: boolean;
    }
  ) {}
}

export class RemoveContactCommand {
  constructor(
    public readonly customerId: string,
    public readonly contactId: string
  ) {}
}

export class AddAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly type: string,
    public readonly street1: string,
    public readonly street2: string | null,
    public readonly city: string,
    public readonly stateProvince: string | null,
    public readonly postalCode: string,
    public readonly countryIso2: string,
    public readonly isPrimary: boolean
  ) {}
}

export class UpdateAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly addressId: string,
    public readonly updates: {
      type?: string;
      street1?: string;
      street2?: string | null;
      city?: string;
      stateProvince?: string | null;
      postalCode?: string;
      countryIso2?: string;
      isPrimary?: boolean;
    }
  ) {}
}

export class RemoveAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly addressId: string
  ) {}
}

export class UpdateCreditProfileCommand {
  constructor(
    public readonly customerId: string,
    public readonly creditLimitAmount: number,
    public readonly creditTerms: string,
    public readonly riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    public readonly creditHoldFlag: boolean,
    public readonly preferredInvoiceDelivery: 'EMAIL' | 'WHATSAPP' | 'PRINT' | 'PORTAL'
  ) {}
}
