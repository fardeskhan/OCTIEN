import { Customer, Invoice, SalesOrder } from '@/types'

export const mockCustomers: Customer[] = [
  { id: "CUST-001", name: "Acme Corporation", type: "B2B", status: "Active", healthScore: 92, outstandingBalance: 45000.00, lastOrderDate: "2026-07-05" },
  { id: "CUST-002", name: "Global Retailers Ltd", type: "Retail", status: "Active", healthScore: 78, outstandingBalance: 12500.50, lastOrderDate: "2026-06-28" },
  { id: "CUST-003", name: "Midwest Distributors", type: "Distributor", status: "On Hold", healthScore: 45, outstandingBalance: 125000.00, lastOrderDate: "2026-05-15" },
  { id: "CUST-004", name: "TechStart Inc", type: "B2B", status: "Active", healthScore: 88, outstandingBalance: 0, lastOrderDate: "2026-07-01" },
]

export const mockInvoices: Invoice[] = [
  { id: "INV-2026-805", date: "2026-07-06", dueDate: "2026-08-05", customer: "Acme Corporation", status: "Sent", total: 12500.00, balance: 12500.00 },
  { id: "INV-2026-804", date: "2026-06-25", dueDate: "2026-07-05", customer: "Global Retailers Ltd", status: "Overdue", total: 4500.50, balance: 4500.50 },
  { id: "INV-2026-803", date: "2026-06-15", dueDate: "2026-07-15", customer: "TechStart Inc", status: "Paid", total: 850.00, balance: 0.00 },
  { id: "INV-2026-802", date: "2026-06-01", dueDate: "2026-07-01", customer: "Midwest Distributors", status: "Paid", total: 45000.00, balance: 0.00 },
]

export const mockOrders: SalesOrder[] = [
  { id: "SO-2026-1045", date: "2026-07-06", customer: "Acme Corporation", status: "Processing", total: 12500.00 },
  { id: "SO-2026-1044", date: "2026-07-05", customer: "Global Retailers Ltd", status: "Shipped", total: 4500.50 },
  { id: "SO-2026-1043", date: "2026-07-05", customer: "TechStart Inc", status: "Confirmed", total: 850.00 },
  { id: "SO-2026-1042", date: "2026-07-01", customer: "Midwest Distributors", status: "Delivered", total: 45000.00 },
]


