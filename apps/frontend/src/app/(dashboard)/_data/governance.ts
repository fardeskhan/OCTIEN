import { ApprovalRequest, AuditEvent, DelegatedRule, EWB, ComplianceException, GSTFiling, ComplianceJob, ComplianceTask, PermissionDef, AccessReview, Role, User, AffectedUser } from '@/types'
export const mockDelegated: DelegatedRule[] = [
  { id: "DEL-01", delegate: "Mark Doe", type: "All Purchase Orders", startDate: "2026-07-01", endDate: "2026-07-15", status: "Active" },
]

export const mockHistory: ApprovalRequest[] = [
  { id: "REQ-1011", type: "Purchase Order", requester: "Jane Smith", status: "Approved", amount: 15000, riskScore: 20, approversRemaining: 0, details: { vendor: "Tech Corp", purpose: "New Servers" } },
  { id: "REQ-1010", type: "Journal Entry", requester: "Mark Doe", status: "Rejected", amount: 500000, riskScore: 88, approversRemaining: 0, details: { description: "Incorrect Accrual" } },
]

export const mockRequests: ApprovalRequest[] = [
  { id: "REQ-1045", type: "Purchase Order", requester: "Jane Smith", status: "Pending", amount: 45000, riskScore: 85, approversRemaining: 1, details: { vendor: "Tech Corp", purpose: "Server Upgrade" } },
  { id: "REQ-1046", type: "Journal Entry", requester: "Mark Doe", status: "Pending", amount: 1500000, riskScore: 92, approversRemaining: 2, details: { description: "Quarterly Accruals", accounts: ["1200", "2100"] } },
  { id: "REQ-1047", type: "Role Assignment", requester: "System", status: "Pending", riskScore: 45, approversRemaining: 1, details: { user: "john.doe", newRole: "Finance Manager" } },
]

export const mockPending: ApprovalRequest[] = [
  { id: "REQ-1042", type: "Purchase Order", requester: "Jane Smith", status: "Pending", amount: 12000, riskScore: 35, approversRemaining: 1, details: { vendor: "Office Supplies Co", purpose: "New Laptops" } },
]

export const mockCloseEvents: AuditEvent[] = [
  {
    id: "EVT-70011",
    timestamp: "2026-06-03 14:30:00",
    user: "System Administrator",
    action: "Closed Period",
    entity: "May 2026",
    type: "Finance",
    severity: "Warning",
    details: { durationDays: 3, adjustments: 2 }
  },
  {
    id: "EVT-70012",
    timestamp: "2026-06-03 10:00:00",
    user: "Jane Smith",
    action: "Adjusting Entry Posted",
    entity: "Journal #JE-901",
    type: "Finance",
    severity: "Info",
  },
]

export const mockDocEvents: AuditEvent[] = [
  {
    id: "EVT-60011",
    timestamp: "2026-07-06 14:32:00",
    user: "Jane Smith",
    action: "Uploaded",
    entity: "Vendor Invoice INV-505.pdf",
    type: "Document",
    severity: "Info",
  },
  {
    id: "EVT-60012",
    timestamp: "2026-07-06 09:15:45",
    user: "System",
    action: "Archived",
    entity: "Q1_Financials_Draft.xlsx",
    type: "Document",
    severity: "Warning",
  },
]

export const mockSensitiveEvents: AuditEvent[] = [
  {
    id: "EVT-80011",
    timestamp: "2026-07-06 11:05:12",
    user: "Admin",
    action: "Modified Role",
    entity: "Finance Manager",
    type: "Security",
    severity: "Critical",
    before: { permissions: ["finance.read"] },
    after: { permissions: ["finance.read", "finance.write"] }
  },
  {
    id: "EVT-80012",
    timestamp: "2026-07-05 14:20:00",
    user: "Admin",
    action: "Deleted",
    entity: "Bank Account #BA-4421",
    type: "Finance",
    severity: "Critical",
  },
]

export const mockAuditEvents: AuditEvent[] = [
  {
    id: "EVT-90021",
    timestamp: "2026-07-06 14:32:00",
    user: "System (Automation)",
    action: "Generated",
    entity: "GSTR-3B Return (June 2026)",
    type: "Compliance",
    severity: "Info",
  },
  {
    id: "EVT-90022",
    timestamp: "2026-07-06 13:15:45",
    user: "John Doe",
    action: "Approved",
    entity: "Purchase Order #PO-9442",
    type: "Approval",
    severity: "Info",
    before: { status: "Pending" },
    after: { status: "Approved" }
  },
  {
    id: "EVT-90023",
    timestamp: "2026-07-06 11:05:12",
    user: "Admin",
    action: "Modified Role",
    entity: "Finance Manager",
    type: "Security",
    severity: "Critical",
    before: { permissions: ["finance.read"] },
    after: { permissions: ["finance.read", "finance.write"] }
  },
  {
    id: "EVT-90024",
    timestamp: "2026-07-06 09:30:00",
    user: "Jane Smith",
    action: "Failed Login Attempt",
    entity: "User Account (jsmith)",
    type: "Security",
    severity: "Warning",
    details: { reason: "Invalid Password", ip: "192.168.1.45" }
  },
  {
    id: "EVT-90025",
    timestamp: "2026-07-05 18:45:00",
    user: "Mark Doe",
    action: "Posted",
    entity: "Journal Entry #JE-1044",
    type: "Finance",
    severity: "Info",
  },
]

export const mockEWBs: EWB[] = [
  { id: "EWB-01", ewbNo: "123456789012", date: "2026-06-25", vehicle: "MH 04 AB 1234", destination: "Pune Warehouse", status: "Active", validUntil: "2026-06-27" },
  { id: "EWB-02", ewbNo: "987654321098", date: "2026-06-20", vehicle: "KA 01 XY 9876", destination: "Bangalore Hub", status: "Expired", validUntil: "2026-06-22" },
  { id: "EWB-03", ewbNo: "456789123012", date: "2026-06-26", vehicle: "GJ 03 ZZ 5555", destination: "Surat Distributor", status: "Cancelled", validUntil: "2026-06-28" },
]

export const mockExceptions: ComplianceException[] = [
  { id: "EXC-1001", source: "GST Filing Job", issue: "API Validation Failed: Invalid GSTIN format for Customer C-892", severity: "Critical", detectedAt: "2026-07-06 08:30", assignedTo: "Finance Team" },
  { id: "EXC-1002", source: "E-Way Bill System", issue: "EWB EXPIRED for Shipment SHP-44021 before delivery.", severity: "Critical", detectedAt: "2026-07-06 09:15", assignedTo: "Logistics Team" },
  { id: "EXC-1003", source: "Tax Reconciliation", issue: "Variance detected between GSTR-2B and Purchase Register (>$5,000)", severity: "Warning", detectedAt: "2026-07-05 18:00", assignedTo: "Tax Manager" },
]

export const mockGST: GSTFiling[] = [
  { id: "GST-06-26-3B", period: "June 2026", formType: "GSTR-3B", status: "Failed", dueDate: "2026-07-20", taxAmount: 145000 },
  { id: "GST-06-26-1", period: "June 2026", formType: "GSTR-1", status: "Draft", dueDate: "2026-07-11", taxAmount: 120000 },
  { id: "GST-05-26-3B", period: "May 2026", formType: "GSTR-3B", status: "Filed", dueDate: "2026-06-20", taxAmount: 135000 },
]

export const mockJobs: ComplianceJob[] = [
  { id: "JOB-001", name: "GSTIN Validation Sync", schedule: "Daily at 00:00", lastRun: "2026-07-06 00:00", status: "Success", nextRun: "2026-07-07 00:00" },
  { id: "JOB-002", name: "EWB Expiry Alerts", schedule: "Hourly", lastRun: "2026-07-06 09:00", status: "Failed", nextRun: "2026-07-06 10:00" },
  { id: "JOB-003", name: "Vendor Blacklist Check", schedule: "Weekly (Sunday)", lastRun: "2026-07-05 02:00", status: "Success", nextRun: "2026-07-12 02:00" },
]

export const mockTasks: ComplianceTask[] = [
  { id: "TSK-001", task: "Submit PF Returns", category: "Labor Law", dueDate: "2026-07-15", status: "Pending", assignedTo: "HR Team" },
  { id: "TSK-002", task: "Renew Trade License (Mumbai)", category: "Licenses", dueDate: "2026-07-05", status: "Overdue", assignedTo: "Legal Team" },
  { id: "TSK-003", task: "Quarterly TDS Filing", category: "Taxation", dueDate: "2026-06-30", status: "Completed", assignedTo: "Finance Team" },
]

export const mockSecurityEvents: AuditEvent[] = [
  {
    id: "EVT-50024",
    timestamp: "2026-07-06 09:30:00",
    user: "Jane Smith",
    action: "Failed Login Attempt",
    entity: "User Account (jsmith)",
    type: "Security",
    severity: "Warning",
    details: { reason: "Invalid Password", ip: "192.168.1.45" }
  },
  {
    id: "EVT-50025",
    timestamp: "2026-07-06 09:25:00",
    user: "Admin",
    action: "API Key Generated",
    entity: "Integration Service Account",
    type: "Security",
    severity: "Critical",
  },
  {
    id: "EVT-50026",
    timestamp: "2026-07-05 14:10:00",
    user: "Mark Doe",
    action: "Password Reset",
    entity: "User Account (mdoe)",
    type: "Security",
    severity: "Info",
  },
]

export const mockPermissions: PermissionDef[] = [
  { id: "finance.read", module: "Finance", action: "Read", description: "View financial data and reports." },
  { id: "finance.write", module: "Finance", action: "Write", description: "Create and edit financial records." },
  { id: "approvals.manage", module: "Governance", action: "Manage", description: "Override or reassign approvals." },
]

export const mockReviews: AccessReview[] = [
  { id: "REV-2026-Q2", campaign: "Q2 User Access Review", reviewer: "Jane Smith", status: "In Progress", dueDate: "2026-07-15", progress: 45 },
  { id: "REV-2026-Q1", campaign: "Q1 User Access Review", reviewer: "Jane Smith", status: "Completed", dueDate: "2026-04-15", progress: 100 },
]

export const mockRoles: Role[] = [
  { id: "ROL-001", name: "SuperAdmin", description: "Full system access.", assignedUsers: 2, isCustom: false },
  { id: "ROL-002", name: "Finance Manager", description: "Access to all finance modules and approvals.", assignedUsers: 12, isCustom: true },
  { id: "ROL-003", name: "Sales Rep", description: "Access to sales orders and customers.", assignedUsers: 45, isCustom: false },
]

export const mockAffectedUsers: AffectedUser[] = [
  { id: "USR-01", name: "Alice Smith", department: "Finance", currentRole: "Accountant", newAccessCount: 12, riskLevel: "High", lastActive: "2026-07-05" },
  { id: "USR-02", name: "Bob Jones", department: "Operations", currentRole: "Manager", newAccessCount: 5, riskLevel: "High", lastActive: "2026-07-06" }
]

export const mockUsers: User[] = [
  { id: "USR-001", name: "Jane Smith", email: "jane@cosmy.com", role: "SuperAdmin", lastLogin: "Today, 08:30 AM", status: "Active", isAdmin: true },
  { id: "USR-002", name: "Mark Doe", email: "mark@cosmy.com", role: "Finance Manager", lastLogin: "Yesterday, 14:00 PM", status: "Active", isAdmin: false },
  { id: "USR-003", name: "System User", email: "system@cosmy.com", role: "System", lastLogin: "Never", status: "Dormant", isAdmin: true },
  { id: "USR-004", name: "John Doe", email: "john@cosmy.com", role: "Sales Rep", lastLogin: "2 Months Ago", status: "Disabled", isAdmin: false },
]

