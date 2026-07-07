import { BaseEntity, AuditFields } from "./common"

export interface CollectionSource extends BaseEntity, AuditFields {
  name: string
  type: string
  zone: string
  volumeKg: number
  qualityGrade: "A" | "B" | "C" | "Reject"
  growthTrend: number
  missedPickupPct: number
  frequency: string
  revenue: number
}

export interface Collection extends BaseEntity, AuditFields {
  source: string
  route: string
  expectedVolume: number
  date: string
  // Additional fields for completed/missed
  status?: "Pending" | "Scheduled" | "Completed" | "Missed"
  actualVolume?: number
  driver?: string
  reason?: string
}

export interface Route extends BaseEntity, AuditFields {
  name: string
  driver: string
  stops: number
  collectedKg: number
  efficiency: number
  status: "Healthy" | "Delayed" | "Critical"
}

export interface RouteStop extends BaseEntity, AuditFields {
  route: string
  source: string
  sequence: number
  eta: string
  status: "Pending" | "Completed" | "Skipped"
}

export interface RouteException extends BaseEntity, AuditFields {
  route: string
  driver: string
  exceptionType: string
  timeLogged: string
  status: "Open" | "Resolved"
}

export interface Barrel extends BaseEntity, AuditFields {
  capacity: number
  location: string
  lastCollectionDays: number
  status: "Deployed" | "In Transit" | "Processing" | "Maintenance" | "Lost"
}

export interface QualityInspection extends BaseEntity, AuditFields {
  source: string
  batchVolume: number
  grade: "A" | "B" | "C" | "Reject"
  ffaPct: number
  moisturePct: number
  status: "Accepted" | "Rejected" | "Pending Inspection"
}
