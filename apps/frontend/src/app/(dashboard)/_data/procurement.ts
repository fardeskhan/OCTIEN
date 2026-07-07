import { PurchaseOrder, Receipt, Supplier } from '@/types'

export const mockOrders: PurchaseOrder[] = [
  { id: "PO-2026-089", date: "2026-07-01", supplier: "Global Supply Co", status: "Received", total: 45000.00 },
  { id: "PO-2026-090", date: "2026-07-03", supplier: "Tech Parts Ltd", status: "Sent", total: 12500.50 },
  { id: "PO-2026-091", date: "2026-07-05", supplier: "Acme Packaging", status: "Partial", total: 8500.00 },
  { id: "PO-2026-092", date: "2026-07-06", supplier: "Office Essentials", status: "Approved", total: 450.00 },
]

export const mockReceipts: Receipt[] = [
  { id: "GRN-2026-112", date: "2026-07-06", poNumber: "PO-2026-091", supplier: "Acme Packaging", status: "Pending", items: 4 },
  { id: "GRN-2026-111", date: "2026-07-05", poNumber: "PO-2026-089", supplier: "Global Supply Co", status: "Completed", items: 12 },
  { id: "GRN-2026-110", date: "2026-07-04", poNumber: "PO-2026-085", supplier: "Tech Parts Ltd", status: "Discrepancy", items: 2 },
]

export const mockSuppliers: Supplier[] = [
  { id: "SUP-101", name: "Global Supply Co", category: "Raw Materials", status: "Active", rating: 4.8, leadTime: "14 Days" },
  { id: "SUP-102", name: "Tech Parts Ltd", category: "Electronics", status: "Active", rating: 4.2, leadTime: "30 Days" },
  { id: "SUP-103", name: "Acme Packaging", category: "Packaging", status: "Pending Review", rating: 0, leadTime: "7 Days" },
  { id: "SUP-104", name: "Office Essentials", category: "Consumables", status: "Active", rating: 4.5, leadTime: "3 Days" },
]


