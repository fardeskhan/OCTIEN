import { Adjustment, Movement, StockLevel, Product, Transfer, Valuation } from '@/types'

export const mockAdjustments: Adjustment[] = [
  { id: "ADJ-2026-004", date: "2026-07-06", status: "Pending", location: "Main WH", reason: "Damage", amount: -450.00 },
  { id: "ADJ-2026-003", date: "2026-07-05", status: "Approved", location: "R&D Lab", reason: "Cycle Count", amount: 15.50 },
  { id: "ADJ-2026-002", date: "2026-07-01", status: "Approved", location: "Main WH", reason: "Spoilage", amount: -1200.00 },
]

export const mockMovements: Movement[] = [
  { id: "1", date: "2026-07-06 09:15", type: "Receipt", productCode: "PRD-001", quantity: 500, location: "Main WH", reference: "PO-2026-089" },
  { id: "2", date: "2026-07-06 08:30", type: "Issue", productCode: "PRD-002", quantity: -50, location: "Main WH", reference: "SO-2026-112" },
  { id: "3", date: "2026-07-05 16:45", type: "Transfer", productCode: "PRD-001", quantity: -100, location: "Main WH -> Retail 1", reference: "TR-2026-045" },
  { id: "4", date: "2026-07-05 14:20", type: "Adjustment", productCode: "PRD-004", quantity: -2, location: "R&D Lab", reference: "ADJ-2026-003" },
]

export const mockStock: StockLevel[] = [
  { id: "1", productCode: "PRD-001", productName: "Premium Widget", warehouse: "Main WH", zone: "A1", onHand: 1500, allocated: 300, available: 1200, status: "In Stock" },
  { id: "2", productCode: "PRD-002", productName: "Standard Widget", warehouse: "Main WH", zone: "B2", onHand: 8500, allocated: 1500, available: 7000, status: "In Stock" },
  { id: "3", productCode: "PRD-004", productName: "New Prototype X", warehouse: "R&D Lab", zone: "T1", onHand: 12, allocated: 0, available: 12, status: "Low Stock" },
  { id: "4", productCode: "PRD-003", productName: "Legacy Component", warehouse: "Archive", zone: "Z9", onHand: 0, allocated: 0, available: 0, status: "Out of Stock" },
]

export const mockProducts: Product[] = [
  { id: "1", code: "PRD-001", name: "Premium Widget", category: "Hardware", status: "Active", stock: 1500, price: 45.00 },
  { id: "2", code: "PRD-002", name: "Standard Widget", category: "Hardware", status: "Active", stock: 8500, price: 25.00 },
  { id: "3", code: "PRD-003", name: "Legacy Component", category: "Hardware", status: "Archived", stock: 0, price: 15.00 },
  { id: "4", code: "PRD-004", name: "New Prototype X", category: "R&D", status: "Draft", stock: 12, price: 99.00 },
]

export const mockTransfers: Transfer[] = [
  { id: "TR-2026-046", date: "2026-07-06", status: "Pending", source: "Main WH", destination: "Retail 2", items: 4 },
  { id: "TR-2026-045", date: "2026-07-05", status: "In Transit", source: "Main WH", destination: "Retail 1", items: 12 },
  { id: "TR-2026-044", date: "2026-07-04", status: "Completed", source: "Supplier Depot", destination: "Main WH", items: 45 },
]

export const mockValuations: Valuation[] = [
  { id: "VAL-1", category: "Hardware", totalItems: 12500, avgCost: 32.50, totalValue: 406250.00, turnoverRatio: 4.2 },
  { id: "VAL-2", category: "Consumables", totalItems: 85000, avgCost: 1.25, totalValue: 106250.00, turnoverRatio: 12.5 },
  { id: "VAL-3", category: "R&D Parts", totalItems: 450, avgCost: 150.00, totalValue: 67500.00, turnoverRatio: 0.8 },
  { id: "VAL-4", category: "Packaging", totalItems: 120000, avgCost: 0.15, totalValue: 18000.00, turnoverRatio: 24.0 },
]


