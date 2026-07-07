import { BaseEntity, AuditFields } from "./common"

export interface ApprovalRequest extends BaseEntity, AuditFields {
  type: string
  requester: string
  status: "Pending" | "Approved" | "Rejected" | "Changes Requested"
  amount?: number
  riskScore: number
  approversRemaining: number
  details?: Record<string, any>
}

export interface AuditEvent extends BaseEntity, AuditFields {
  timestamp: string
  user: string
  action: string
  entity: string
  type: "Approval" | "Security" | "Compliance" | "Document" | "Finance" | "System"
  severity: "Info" | "Warning" | "Critical"
  details?: Record<string, any>
  before?: Record<string, any>
  after?: Record<string, any>
}

export interface DelegatedRule extends BaseEntity, AuditFields {
  delegate: string
  type: string
  startDate: string
  endDate: string
  status: "Active" | "Scheduled" | "Expired"
}

export interface EWB extends BaseEntity, AuditFields {
  ewbNo: string
  date: string
  vehicle: string
  destination: string
  status: "Active" | "Expired" | "Cancelled"
  validUntil: string
}

export interface ComplianceException extends BaseEntity, AuditFields {
  source: string
  issue: string
  severity: "Critical" | "Warning"
  detectedAt: string
  assignedTo: string
}

export interface GSTFiling extends BaseEntity, AuditFields {
  period: string
  formType: string
  status: "Filed" | "Draft" | "Overdue" | "Failed"
  dueDate: string
  taxAmount: number
}

export interface ComplianceJob extends BaseEntity, AuditFields {
  name: string
  schedule: string
  lastRun: string
  status: "Success" | "Failed" | "Running"
  nextRun: string
}

export interface ComplianceTask extends BaseEntity, AuditFields {
  task: string
  category: string
  dueDate: string
  status: "Pending" | "Completed" | "Overdue"
  assignedTo: string
}

export interface PermissionDef extends BaseEntity, AuditFields {
  module: string
  action: string
  description: string
}

export interface AccessReview extends BaseEntity, AuditFields {
  campaign: string
  reviewer: string
  status: "Pending" | "In Progress" | "Completed"
  dueDate: string
  progress: number
}

export interface Role extends BaseEntity, AuditFields {
  name: string
  description: string
  assignedUsers: number
  isCustom: boolean
}

export interface AffectedUser extends BaseEntity, AuditFields {
  name: string
  department: string
  currentRole: string
  lastActive: string
  newAccessCount?: number
  riskLevel?: "Low" | "Medium" | "High"
}

export interface User extends BaseEntity, AuditFields {
  name: string
  email: string
  role: string
  lastLogin: string
  status: "Active" | "Dormant" | "Disabled"
  isAdmin: boolean
}
