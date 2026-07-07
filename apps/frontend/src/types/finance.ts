import { BaseEntity, AuditFields } from "./common"

export interface JournalEntry extends BaseEntity, AuditFields {
  date: string
  reference: string
  description: string
  status: "Draft" | "Posted" | "Reversed"
  debit: number
  credit: number
}

export interface LedgerEntry extends BaseEntity, AuditFields {
  date: string
  account: string
  description: string
  journalRef: string
  debit: number | null
  credit: number | null
  runningBalance: number
}

export interface TrialBalanceEntry extends BaseEntity, AuditFields {
  account: string
  name: string
  type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense"
  debit: number | null
  credit: number | null
}

export interface DepreciationEntry extends BaseEntity, AuditFields {
  assetName: string
  method: string
  period: string
  amount: number
  posted: boolean
}

export interface AssetMovement extends BaseEntity, AuditFields {
  date: string
  asset: string
  type: "Acquisition" | "Disposal" | "Transfer" | "Revaluation"
  amount: number
  description: string
}

export interface Asset extends BaseEntity, AuditFields {
  name: string
  category: string
  location: string
  purchaseCost: number
  bookValue: number
  status: "Active" | "Disposed" | "In Repair"
}

export interface CloseTask extends BaseEntity, AuditFields {
  category: string
  task: string
  assignedTo: string
  dueDate: string
  status: "Not Started" | "In Progress" | "Completed" | "Blocked"
  critical: boolean
}

export interface CloseHistory extends BaseEntity, AuditFields {
  period: string
  closedBy: string
  closedAt: string
  durationDays: number
  adjustments: number
}

export interface Period extends BaseEntity, AuditFields {
  name: string
  startDate: string
  endDate: string
  status: "Open" | "Closed" | "Adjusting"
}

export interface BankAccount extends BaseEntity, AuditFields {
  name: string
  bank: string
  accountNumber: string
  currency: string
  status: "Active" | "Closed" | "Frozen"
}

export interface CashPosition extends BaseEntity, AuditFields {
  account: string
  bank: string
  currency: string
  balance: number
  reconciledDate: string
}

export interface ForecastItem extends BaseEntity, AuditFields {
  date: string
  inflows: number
  outflows: number
  netPosition: number
  projectedBalance: number
}

export interface ReconItem extends BaseEntity, AuditFields {
  date: string
  description: string
  amount: number
  type: "Bank Feed" | "Ledger Entry"
  matchStatus: "Matched" | "Unmatched" | "Suggested"
}

export interface FinancialRow extends BaseEntity, AuditFields {
  label: string
  isTotal?: boolean
  values: {
    actual: number
    prior?: number
    variance?: number
    variancePercent?: number
    budget?: number
  }
  children?: FinancialRow[]
}
