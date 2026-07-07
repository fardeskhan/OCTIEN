import { BaseEntity, AuditFields } from "./common"

export interface Cooler extends BaseEntity, AuditFields {
  assetId: string
  model: string
  store: string
  installDate: string
  lastService: string
  status: "Active" | "Maintenance Due" | "Out of Service" | "Missing"
}

export interface MaintenanceJob extends BaseEntity, AuditFields {
  ticketId: string
  assetId: string
  storeName: string
  issue: string
  status: "Open" | "In Progress" | "Resolved"
  reportedOn: string
}

export interface Placement extends BaseEntity, AuditFields {
  storeName: string
  district: string
  assetType: string
  placedOn: string
  performanceMultiplier: number
}

export interface POSMaterial extends BaseEntity, AuditFields {
  item: string
  category: string
  inventory: number
  reorderPoint: number
  status: "In Stock" | "Low Stock" | "Out of Stock"
}

export interface CoverageData extends BaseEntity, AuditFields {
  district: string
  totalOutlets: number
  coveredOutlets: number
  numericDistribution: number
  weightedDistribution: number
}

export interface Distributor extends BaseEntity, AuditFields {
  name: string
  territory: string
  tier: "Platinum" | "Gold" | "Silver"
  status: "Active" | "Inactive"
  score: number
  salesGrowth: number
  coverage: number
  outstandingAR: number
  orderFrequency: string
}

export interface TradeScheme extends BaseEntity, AuditFields {
  name: string
  type: string
  status: "Active" | "Draft" | "Completed"
  budget: number
  utilization: number
}

export interface Territory extends BaseEntity, AuditFields {
  name: string
  region: string
  distributors: number
  coverage: number
  status: "Healthy" | "At Risk" | "Critical"
}

export interface Contractor extends BaseEntity, AuditFields {
  name: string
  capacity: string
  utilization: number
  region: string
  contractValidUntil: string
}

export interface Partner extends BaseEntity, AuditFields {
  name: string
  lines: number
  certifications: string[]
  status: "Active" | "Inactive"
}



export interface RetailBranding extends BaseEntity, AuditFields {
  storeName: string
  brandingType: string
  installDate: string
  condition: "Excellent" | "Good" | "Needs Replacement"
  cost: number
}

export interface Campaign extends BaseEntity, AuditFields {
  name: string
  budget: number
  spend: number
  reach: string
  roi: number
  status: "Active" | "Planned" | "Completed"
}

export interface Influencer extends BaseEntity, AuditFields {
  name: string
  platform: string
  followers: string
  activeCampaigns: number
  engagementRate: number
}

export interface SamplingEvent extends BaseEntity, AuditFields {
  eventName: string
  location: string
  unitsDistributed: number
  conversionRate: number
  date: string
}

export interface ProductionBatch extends BaseEntity, AuditFields {
  productionDate: string
  manufacturer: string
  fillingPartner: string
  quantityProduced: number
  status: "Released" | "QA Hold" | "Recalled" | string
  product: string
}
