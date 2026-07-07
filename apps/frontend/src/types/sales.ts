import { BaseEntity, AuditFields } from "./common"

export interface Customer extends BaseEntity, AuditFields {
  name: string
  type?: "B2B" | "Retail" | "Distributor"
  status?: "Active" | "On Hold" | "Inactive"
  healthScore?: number
  outstandingBalance?: number
  lastOrderDate?: string
  industry?: "Biodiesel" | "Soap Mfg" | "Industrial" | string
  volumePurchased?: number
  avgPricePerKg?: number
  revenue?: number
  marginPct?: number
}

export interface Invoice extends BaseEntity, AuditFields {
  date: string
  dueDate: string
  customer: string
  status: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled"
  total: number
  balance: number
}

export interface SalesOrder extends BaseEntity, AuditFields {
  date: string
  customer: string
  status: "Draft" | "Confirmed" | "Processing" | "Shipped" | "Delivered" | "Cancelled"
  total: number
}
