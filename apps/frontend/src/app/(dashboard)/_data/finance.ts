import { FinancialRow, JournalEntry, LedgerEntry, TrialBalanceEntry, DepreciationEntry, AssetMovement, Asset, CloseTask, CloseHistory, Period, BankAccount, CashPosition, ForecastItem, ReconItem } from '@/types'

export const mockJournals: JournalEntry[] = [
  { id: "JE-2026-1042", date: "2026-07-06", reference: "INV-2026-805", description: "Sales Revenue Recognition", status: "Posted", debit: 12500.00, credit: 12500.00 },
  { id: "JE-2026-1043", date: "2026-07-06", reference: "PAY-2026-090", description: "Supplier Payment", status: "Posted", debit: 4500.50, credit: 4500.50 },
  { id: "JE-2026-1044", date: "2026-07-05", reference: "ADJ-2026-004", description: "Inventory Write-off", status: "Draft", debit: 450.00, credit: 450.00 },
]

export const mockLedger: LedgerEntry[] = [
  { id: "L-101", date: "2026-07-06", account: "1000 - Cash", description: "Customer Payment", journalRef: "JE-2026-1042", debit: 12500.00, credit: null, runningBalance: 124500.00 },
  { id: "L-102", date: "2026-07-05", account: "1000 - Cash", description: "Supplier Payment", journalRef: "JE-2026-1040", debit: null, credit: 4500.00, runningBalance: 112000.00 },
  { id: "L-103", date: "2026-07-04", account: "1000 - Cash", description: "Opening Balance", journalRef: "SYS-BAL", debit: 116500.00, credit: null, runningBalance: 116500.00 },
]

export const mockTrialBalance: TrialBalanceEntry[] = [
{ id: 'TB-1', account: "1000", name: "Cash and Cash Equivalents", type: "Asset", debit: 124500.00, credit: null },
  { id: 'TB-2', account: "1200", name: "Accounts Receivable", type: "Asset", debit: 45000.00, credit: null },
  { id: 'TB-3', account: "2000", name: "Accounts Payable", type: "Liability", debit: null, credit: 28500.00 },
  { id: 'TB-4', account: "3000", name: "Retained Earnings", type: "Equity", debit: null, credit: 50000.00 },
  { id: 'TB-5', account: "4000", name: "Sales Revenue", type: "Revenue", debit: null, credit: 150000.00 },
  { id: 'TB-6', account: "5000", name: "Cost of Goods Sold", type: "Expense", debit: 45000.00, credit: null },
  { id: 'TB-7', account: "6000", name: "Operating Expenses", type: "Expense", debit: 14000.00, credit: null },
]

export const mockDepreciation: DepreciationEntry[] = [
  { id: "DEP-001", assetName: "Delivery Truck - NY01", method: "Straight Line", period: "June 2026", amount: 1250, posted: false },
  { id: "DEP-002", assetName: "Delivery Truck - NY02", method: "Straight Line", period: "June 2026", amount: 1250, posted: false },
  { id: "DEP-003", assetName: "Beverage Bottling Line A", method: "Straight Line", period: "June 2026", amount: 4500, posted: false },
  { id: "DEP-004", assetName: "Office Furniture - HQ", method: "Double Declining", period: "June 2026", amount: 250, posted: false },
]

export const mockMovements: AssetMovement[] = [
  { id: "MVT-001", date: "2026-06-15", asset: "Delivery Truck - NY02", type: "Transfer", amount: 0, description: "Transferred from HQ to NY Hub" },
  { id: "MVT-002", date: "2026-06-01", asset: "Old Forklift", type: "Disposal", amount: -5000, description: "Sold for scrap" },
  { id: "MVT-003", date: "2026-05-10", asset: "Beverage Bottling Line A", type: "Acquisition", amount: 450000, description: "Initial Purchase" },
]

export const mockAssets: Asset[] = [
  { id: "FA-0012", name: "Delivery Truck - NY01", category: "Vehicles", location: "New York Hub", purchaseCost: 85000, bookValue: 55000, status: "Active" },
  { id: "FA-0013", name: "Delivery Truck - NY02", category: "Vehicles", location: "New York Hub", purchaseCost: 85000, bookValue: 51000, status: "In Repair" },
  { id: "FA-0045", name: "Beverage Bottling Line A", category: "Machinery", location: "Atlanta Plant", purchaseCost: 450000, bookValue: 380000, status: "Active" },
  { id: "FA-0089", name: "Office Furniture - HQ", category: "Furniture", location: "Corporate HQ", purchaseCost: 25000, bookValue: 5000, status: "Active" },
  { id: "FA-0004", name: "Old Forklift", category: "Equipment", location: "Dallas Warehouse", purchaseCost: 35000, bookValue: 0, status: "Disposed" },
]

export const mockCloseTasks: CloseTask[] = [
  { id: "T-01", category: "Accounts Payable", task: "Ensure all AP invoices are entered", assignedTo: "Sarah Jenkins", dueDate: "2026-06-28", status: "Completed", critical: true },
  { id: "T-02", category: "Accounts Receivable", task: "Generate and send customer statements", assignedTo: "Mark Doe", dueDate: "2026-06-30", status: "Completed", critical: false },
  { id: "T-03", category: "Treasury", task: "Reconcile Operating Account", assignedTo: "Finance Team", dueDate: "2026-07-02", status: "In Progress", critical: true },
  { id: "T-04", category: "Fixed Assets", task: "Run monthly depreciation", assignedTo: "System", dueDate: "2026-07-03", status: "Not Started", critical: true },
  { id: "T-05", category: "General Ledger", task: "Review and post recurring journals", assignedTo: "Finance Team", dueDate: "2026-07-04", status: "Blocked", critical: false },
]

export const mockHistory: CloseHistory[] = [
  { id: "CH-1", period: "May 2026", closedBy: "System Administrator", closedAt: "2026-06-03 14:30", durationDays: 3, adjustments: 2 },
  { id: "CH-2", period: "April 2026", closedBy: "Jane Smith", closedAt: "2026-05-04 11:15", durationDays: 4, adjustments: 5 },
  { id: "CH-3", period: "March 2026", closedBy: "Jane Smith", closedAt: "2026-04-02 09:45", durationDays: 2, adjustments: 0 },
  { id: "CH-4", period: "February 2026", closedBy: "Jane Smith", closedAt: "2026-03-05 16:20", durationDays: 5, adjustments: 1 },
]

export const mockPeriods: Period[] = [
  { id: "PER-2026-07", name: "July 2026", startDate: "2026-07-01", endDate: "2026-07-31", status: "Open" },
  { id: "PER-2026-06", name: "June 2026", startDate: "2026-06-01", endDate: "2026-06-30", status: "Adjusting" },
  { id: "PER-2026-05", name: "May 2026", startDate: "2026-05-01", endDate: "2026-05-31", status: "Closed" },
  { id: "PER-2026-04", name: "April 2026", startDate: "2026-04-01", endDate: "2026-04-30", status: "Closed" },
]

export const mockBalanceSheetData: FinancialRow[] = [
  {
    id: "assets",
    label: "Assets",
    isTotal: true,
    values: { actual: 1250000, prior: 1100000, variance: 150000, variancePercent: 13.6 },
    children: [
      {
        id: "assets-current",
        label: "Current Assets",
        isTotal: true,
        values: { actual: 450000, prior: 400000, variance: 50000, variancePercent: 12.5 },
        children: [
          { id: "ac-cash", label: "Cash & Cash Equivalents", values: { actual: 124500, prior: 100000, variance: 24500, variancePercent: 24.5 } },
          { id: "ac-ar", label: "Accounts Receivable", values: { actual: 200000, prior: 180000, variance: 20000, variancePercent: 11.1 } },
          { id: "ac-inv", label: "Inventory", values: { actual: 125500, prior: 120000, variance: 5500, variancePercent: 4.6 } }
        ]
      },
      {
        id: "assets-fixed",
        label: "Fixed Assets",
        isTotal: true,
        values: { actual: 800000, prior: 700000, variance: 100000, variancePercent: 14.3 },
        children: [
          { id: "af-ppe", label: "Property, Plant & Equipment", values: { actual: 950000, prior: 800000, variance: 150000, variancePercent: 18.8 } },
          { id: "af-dep", label: "Accumulated Depreciation", values: { actual: -150000, prior: -100000, variance: -50000, variancePercent: -50.0 } }
        ]
      }
    ]
  },
  {
    id: "liabilities",
    label: "Liabilities",
    isTotal: true,
    values: { actual: 500000, prior: 450000, variance: 50000, variancePercent: 11.1 },
    children: [
      {
        id: "liab-current",
        label: "Current Liabilities",
        isTotal: true,
        values: { actual: 200000, prior: 180000, variance: 20000, variancePercent: 11.1 },
        children: [
          { id: "lc-ap", label: "Accounts Payable", values: { actual: 120000, prior: 100000, variance: 20000, variancePercent: 20.0 } },
          { id: "lc-tax", label: "Taxes Payable", values: { actual: 80000, prior: 80000, variance: 0, variancePercent: 0 } }
        ]
      },
      {
        id: "liab-lt",
        label: "Long-Term Liabilities",
        isTotal: true,
        values: { actual: 300000, prior: 270000, variance: 30000, variancePercent: 11.1 },
        children: [
          { id: "ll-loan", label: "Bank Loans", values: { actual: 300000, prior: 270000, variance: 30000, variancePercent: 11.1 } }
        ]
      }
    ]
  },
  {
    id: "equity",
    label: "Equity",
    isTotal: true,
    values: { actual: 750000, prior: 650000, variance: 100000, variancePercent: 15.4 },
    children: [
      { id: "eq-cap", label: "Share Capital", values: { actual: 500000, prior: 500000, variance: 0, variancePercent: 0 } },
      { id: "eq-ret", label: "Retained Earnings", values: { actual: 250000, prior: 150000, variance: 100000, variancePercent: 66.7 } }
    ]
  }
]

export const mockCashFlowData: FinancialRow[] = [
  {
    id: "op-act",
    label: "Operating Activities",
    isTotal: true,
    values: { actual: 65000, prior: 50000, variance: 15000, variancePercent: 30.0 },
    children: [
      { id: "op-ni", label: "Net Income", values: { actual: 45000, prior: 38000, variance: 7000, variancePercent: 18.4 } },
      { id: "op-dep", label: "Depreciation & Amortization", values: { actual: 15000, prior: 14000, variance: 1000, variancePercent: 7.1 } },
      { id: "op-wc", label: "Changes in Working Capital", values: { actual: 5000, prior: -2000, variance: 7000, variancePercent: 350.0 } }
    ]
  },
  {
    id: "inv-act",
    label: "Investing Activities",
    isTotal: true,
    values: { actual: -25000, prior: -15000, variance: -10000, variancePercent: -66.7 },
    children: [
      { id: "inv-capex", label: "Capital Expenditures", values: { actual: -30000, prior: -20000, variance: -10000, variancePercent: -50.0 } },
      { id: "inv-sale", label: "Sale of Assets", values: { actual: 5000, prior: 5000, variance: 0, variancePercent: 0 } }
    ]
  },
  {
    id: "fin-act",
    label: "Financing Activities",
    isTotal: true,
    values: { actual: -10000, prior: -5000, variance: -5000, variancePercent: -100.0 },
    children: [
      { id: "fin-debt", label: "Repayment of Debt", values: { actual: -10000, prior: -5000, variance: -5000, variancePercent: -100.0 } }
    ]
  },
  {
    id: "net-change",
    label: "Net Change in Cash",
    isTotal: true,
    values: { actual: 30000, prior: 30000, variance: 0, variancePercent: 0 }
  },
  {
    id: "end-cash",
    label: "Ending Cash Balance",
    isTotal: true,
    values: { actual: 124500, prior: 94500, variance: 30000, variancePercent: 31.7 }
  }
]

export const mockPnLData: FinancialRow[] = [
  {
    id: "rev",
    label: "Revenue",
    isTotal: true,
    values: { actual: 125000, budget: 120000, prior: 110000, variance: 5000, variancePercent: 4.2 },
    children: [
      { id: "rev-bev", label: "Beverage Sales", values: { actual: 85000, budget: 80000, prior: 75000, variance: 5000, variancePercent: 6.3 } },
      { id: "rev-uco", label: "UCO Sales", values: { actual: 40000, budget: 40000, prior: 35000, variance: 0, variancePercent: 0 } }
    ]
  },
  {
    id: "cogs",
    label: "Cost of Goods Sold",
    isTotal: true,
    values: { actual: -45000, budget: -42000, prior: -40000, variance: -3000, variancePercent: -7.1 },
    children: [
      { id: "cogs-mfg", label: "Manufacturing", values: { actual: -30000, budget: -28000, prior: -25000, variance: -2000, variancePercent: -7.1 } },
      { id: "cogs-log", label: "Logistics", values: { actual: -15000, budget: -14000, prior: -15000, variance: -1000, variancePercent: -7.1 } }
    ]
  },
  {
    id: "gp",
    label: "Gross Profit",
    isTotal: true,
    values: { actual: 80000, budget: 78000, prior: 70000, variance: 2000, variancePercent: 2.6 }
  },
  {
    id: "opex",
    label: "Operating Expenses",
    isTotal: true,
    values: { actual: -35000, budget: -36000, prior: -32000, variance: 1000, variancePercent: 2.8 },
    children: [
      { id: "opex-sgna", label: "SG&A", values: { actual: -20000, budget: -21000, prior: -18000, variance: 1000, variancePercent: 4.8 } },
      { id: "opex-rd", label: "Research & Development", values: { actual: -15000, budget: -15000, prior: -14000, variance: 0, variancePercent: 0 } }
    ]
  },
  {
    id: "ebitda",
    label: "EBITDA",
    isTotal: true,
    values: { actual: 45000, budget: 42000, prior: 38000, variance: 3000, variancePercent: 7.1 }
  }
]

export const mockBankAccounts: BankAccount[] = [
  { id: "ACC-01", name: "Operating Account", bank: "Chase", accountNumber: "****4321", currency: "USD", status: "Active" },
  { id: "ACC-02", name: "Payroll Account", bank: "Chase", accountNumber: "****5555", currency: "USD", status: "Active" },
  { id: "ACC-03", name: "Tax Reserve", bank: "Wells Fargo", accountNumber: "****9876", currency: "USD", status: "Active" },
  { id: "ACC-04", name: "Old Operating (Legacy)", bank: "Bank of America", accountNumber: "****1111", currency: "USD", status: "Closed" },
]

export const mockCashPositions: CashPosition[] = [
{ id: 'CP-1', account: "Operating Account", bank: "Chase", currency: "USD", balance: 850000.00, reconciledDate: "2026-07-05" },
  { id: 'CP-2', account: "Payroll Account", bank: "Chase", currency: "USD", balance: 150000.00, reconciledDate: "2026-07-05" },
  { id: 'CP-3', account: "Tax Reserve", bank: "Wells Fargo", currency: "USD", balance: 245000.00, reconciledDate: "2026-07-01" },
]

export const mockForecast: ForecastItem[] = [
{ id: 'FI-1', date: "2026-07-06", inflows: 15000, outflows: -5000, netPosition: 10000, projectedBalance: 1255000 },
  { id: 'FI-2', date: "2026-07-07", inflows: 20000, outflows: -45000, netPosition: -25000, projectedBalance: 1230000 },
  { id: 'FI-3', date: "2026-07-08", inflows: 5000, outflows: -2000, netPosition: 3000, projectedBalance: 1233000 },
  { id: 'FI-4', date: "2026-07-09", inflows: 80000, outflows: -15000, netPosition: 65000, projectedBalance: 1298000 },
]

export const mockReconData: ReconItem[] = [
  { id: "REC-01", date: "2026-07-06", description: "ACH Transfer In - Customer X", amount: 15000.00, type: "Bank Feed", matchStatus: "Suggested" },
  { id: "REC-02", date: "2026-07-06", description: "Payment to Vendor Y", amount: -4500.00, type: "Bank Feed", matchStatus: "Matched" },
  { id: "REC-03", date: "2026-07-05", description: "Unknown Wire Fee", amount: -35.00, type: "Bank Feed", matchStatus: "Unmatched" },
  { id: "REC-04", date: "2026-07-06", description: "INV-2026-805 Payment", amount: 15000.00, type: "Ledger Entry", matchStatus: "Suggested" },
]






