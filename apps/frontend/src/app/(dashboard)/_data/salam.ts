import { Cooler, MaintenanceJob, Placement, POSMaterial, CoverageData, Distributor, TradeScheme, Territory, Contractor, Partner, Supplier, RetailBranding, Campaign, Influencer, SamplingEvent, ProductionBatch } from '@/types'

export const mockCoolers: Cooler[] = [
  { id: "CLR-01", assetId: "CLR-9921", model: "VisiCool 500", store: "Metro Supermarket", installDate: "2024-02-15", lastService: "2026-06-10", status: "Active" },
  { id: "CLR-02", assetId: "CLR-9922", model: "VisiCool 300", store: "Downtown Diner", installDate: "2025-01-10", lastService: "2025-11-20", status: "Maintenance Due" },
  { id: "CLR-03", assetId: "CLR-9923", model: "VisiCool 500", store: "Highway Gas", installDate: "2023-11-05", lastService: "2026-02-15", status: "Out of Service" },
]

export const mockJobs: MaintenanceJob[] = [
  { id: "MJ-01", ticketId: "TKT-8841", assetId: "CLR-9923", storeName: "Highway Gas", issue: "Compressor Failure", status: "Open", reportedOn: "2026-07-05" },
  { id: "MJ-02", ticketId: "TKT-8842", assetId: "CLR-9922", storeName: "Downtown Diner", issue: "Thermostat Calibration", status: "In Progress", reportedOn: "2026-07-06" },
]

export const mockPlacements: Placement[] = [
  { id: "PLC-001", storeName: "SuperMart Express", district: "Mumbai City", assetType: "Visi-Cooler 300L", placedOn: "2024-03-12", performanceMultiplier: 1.4 },
  { id: "PLC-002", storeName: "Highway Dhaba", district: "Pune", assetType: "Chest-Cooler 500L", placedOn: "2023-11-20", performanceMultiplier: 1.8 },
]

export const mockPOS: POSMaterial[] = [
  { id: "POS-01", item: "Salam Danglers (Pack of 50)", category: "Signage", inventory: 450, reorderPoint: 100, status: "In Stock" },
  { id: "POS-02", item: "Summer Promo Posters", category: "Print", inventory: 25, reorderPoint: 100, status: "Low Stock" },
  { id: "POS-03", item: "Branded Table Mats", category: "Utility", inventory: 0, reorderPoint: 50, status: "Out of Stock" },
]

export const mockCoverage: CoverageData[] = [
  { id: "COV-01", district: "Mumbai City", totalOutlets: 12500, coveredOutlets: 9800, numericDistribution: 78.4, weightedDistribution: 85.2 },
  { id: "COV-02", district: "Pune", totalOutlets: 8400, coveredOutlets: 6100, numericDistribution: 72.6, weightedDistribution: 70.1 },
  { id: "COV-03", district: "Nashik", totalOutlets: 3200, coveredOutlets: 1800, numericDistribution: 56.2, weightedDistribution: 50.4 },
]

export const mockDistributors: Distributor[] = [
  { id: "DIST-001", name: "Metro Beverages Ltd", territory: "North Zone", tier: "Platinum", status: "Active", score: 92, salesGrowth: 15, coverage: 85, outstandingAR: 45000, orderFrequency: "Weekly" },
  { id: "DIST-002", name: "Valley Distributors", territory: "South Zone", tier: "Gold", status: "Active", score: 78, salesGrowth: 5, coverage: 60, outstandingAR: 12000, orderFrequency: "Bi-weekly" },
  { id: "DIST-003", name: "Coastal Traders", territory: "East Zone", tier: "Silver", status: "Active", score: 45, salesGrowth: -10, coverage: 40, outstandingAR: 35000, orderFrequency: "Monthly" },
]

export const mockSchemes: TradeScheme[] = [
  { id: "TS-26-07A", name: "Summer Volume Bonus Q3", type: "Volume Discount", status: "Active", budget: 150000, utilization: 45000 },
  { id: "TS-26-07B", name: "New Outlet Acquisition", type: "Placement Fee", status: "Active", budget: 50000, utilization: 32000 },
  { id: "TS-26-08A", name: "Festival Display Contest", type: "Visibility", status: "Draft", budget: 75000, utilization: 0 },
]

export const mockTerritories: Territory[] = [
  { id: "TER-01", name: "North Zone", region: "North", distributors: 12, coverage: 82, status: "Healthy" },
  { id: "TER-02", name: "South Zone", region: "South", distributors: 8, coverage: 65, status: "At Risk" },
  { id: "TER-03", name: "East Zone", region: "East", distributors: 4, coverage: 35, status: "Critical" },
]

export const mockBatches: ProductionBatch[] = [
  { id: "BCH-2607-001", productionDate: "2026-07-06", manufacturer: "Beverage Makers Ltd", fillingPartner: "AquaFill Network", quantityProduced: 125000, status: "QA Hold", product: "Salam Cola Classic 2L PET" },
  { id: "BCH-2607-002", productionDate: "2026-07-05", manufacturer: "South Co-Packers", fillingPartner: "Local Bottling Co", quantityProduced: 50000, status: "Released", product: "Salam Cola Zero 500ml" },
  { id: "BCH-2606-099", productionDate: "2026-06-30", manufacturer: "Beverage Makers Ltd", fillingPartner: "AquaFill Network", quantityProduced: 100000, status: "Recalled", product: "Salam Cola Classic 2L PET" },
]

export const mockContractors: Contractor[] = [
  { id: "CM-01", name: "Beverage Makers Ltd", capacity: "1M Cases/Mo", utilization: 85, region: "North Zone", contractValidUntil: "2028-12-31" },
  { id: "CM-02", name: "South Co-Packers", capacity: "500K Cases/Mo", utilization: 92, region: "South Zone", contractValidUntil: "2027-06-30" },
]

export const mockPartners: Partner[] = [
  { id: "FP-01", name: "AquaFill Network", lines: 4, certifications: ["FSSAI", "ISO 22000"], status: "Active" },
  { id: "FP-02", name: "Local Bottling Co", lines: 2, certifications: ["FSSAI"], status: "Active" },
]

export const mockSuppliers: Supplier[] = [
  { id: "SUP-01", name: "GlassWorks Inc.", materialType: "Glass Bottles", qualityScore: 98, activeOrders: 3, status: "Active" },
  { id: "SUP-02", name: "PET Plastics Co.", materialType: "PET Bottles", qualityScore: 85, activeOrders: 5, status: "Probation" },
  { id: "SUP-03", name: "Sweeteners Global", materialType: "Raw Ingredients", qualityScore: 99, activeOrders: 12, status: "Active" },
]

export const mockBranding: RetailBranding[] = [
  { id: "BRD-001", storeName: "SuperMart Express", brandingType: "Storefront Signage", installDate: "2025-11-10", condition: "Needs Replacement", cost: 1200 },
  { id: "BRD-002", storeName: "QuickStop Grocery", brandingType: "Gondola Endcap", installDate: "2026-05-20", condition: "Excellent", cost: 450 },
]

export const mockCampaigns: Campaign[] = [
  { id: "CMP-001", name: "Summer Refresh 2026", budget: 250000, spend: 120000, reach: "5.2M", roi: 310, status: "Active" },
  { id: "CMP-002", name: "Cricket Sponsorship", budget: 500000, spend: 500000, reach: "15M", roi: 185, status: "Completed" },
  { id: "CMP-003", name: "Campus Ambassador", budget: 50000, spend: 0, reach: "-", roi: 0, status: "Planned" },
]

export const mockInfluencers: Influencer[] = [
  { id: "INF-001", name: "@DrinkSalam", platform: "Instagram", followers: "1.2M", activeCampaigns: 2, engagementRate: 4.5 },
  { id: "INF-002", name: "Local Foodie", platform: "TikTok", followers: "850K", activeCampaigns: 1, engagementRate: 6.2 },
]

export const mockEvents: SamplingEvent[] = [
  { id: "SMP-001", eventName: "University Fest Sponsor", location: "Pune Univ Campus", unitsDistributed: 2500, conversionRate: 12.5, date: "2026-06-15" },
  { id: "SMP-002", eventName: "Mall Activation", location: "Phoenix Marketcity", unitsDistributed: 4200, conversionRate: 8.2, date: "2026-07-02" },
]

