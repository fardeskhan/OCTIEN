import { BaseEntity, AuditFields } from "./common"

export interface PurchaseOrder extends BaseEntity, AuditFields {
  date: string
  supplier: string
  status: "Draft" | "Approved" | "Sent" | "Partial" | "Received" | "Cancelled"
  total: number
}

export interface Receipt extends BaseEntity, AuditFields {
  date: string
  poNumber: string
  supplier: string
  status: "Pending" | "Completed" | "Discrepancy"
  items: number
}

export interface Supplier extends BaseEntity, AuditFields {
  name: string
  category?: string
  status: "Active" | "Pending Review" | "Inactive" | "Probation"
  rating?: number
  leadTime?: string
  materialType?: string
  qualityScore?: number
  activeOrders?: number
}
