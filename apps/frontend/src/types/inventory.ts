import { BaseEntity, AuditFields } from "./common"

export interface Adjustment extends BaseEntity, AuditFields {
  date: string
  status: "Pending" | "Approved" | "Rejected"
  location: string
  reason: string
  amount: number
}

export interface Movement extends BaseEntity, AuditFields {
  date: string
  type: "Receipt" | "Issue" | "Transfer" | "Adjustment"
  productCode: string
  quantity: number
  location: string
  reference: string
}

export interface StockLevel extends BaseEntity, AuditFields {
  productCode: string
  productName: string
  warehouse: string
  zone: string
  onHand: number
  allocated: number
  available: number
  status: "In Stock" | "Low Stock" | "Out of Stock"
}

export interface Product extends BaseEntity, AuditFields {
  code: string
  name: string
  category: string
  status: "Active" | "Draft" | "Archived"
  stock: number
  price: number
}

export interface Transfer extends BaseEntity, AuditFields {
  date: string
  status: "Pending" | "In Transit" | "Completed" | "Cancelled"
  source: string
  destination: string
  items: number
}

export interface Valuation extends BaseEntity, AuditFields {
  category: string
  totalItems: number
  avgCost: number
  totalValue: number
  turnoverRatio: number
}
