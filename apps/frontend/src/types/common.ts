export interface BaseEntity {
  id: string
}

export interface AuditFields {
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

export interface Address {
  street1: string
  street2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface Contact {
  name: string
  email: string
  phone: string
  role?: string
}

export interface Money {
  amount: number
  currency: string
}

export interface DateRange {
  startDate: string
  endDate: string
}
