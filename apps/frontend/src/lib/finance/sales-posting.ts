/**
 * Sales → Finance postings.
 *
 * Turns sales business events into balanced double-entry journal entries via the existing
 * `FinancialPostingService` (which validates balance, open period and account rules). This is
 * the missing link that makes a customer invoice/payment actually hit the General Ledger, so it
 * flows into Trial Balance, P&L and Balance Sheet.
 *
 *   Invoice (GST-inclusive total):   DR Accounts Receivable   CR Sales Revenue   CR Output GST
 *   Payment:                          DR Cash & Bank           CR Accounts Receivable
 */
import { db } from "@/lib/db";
import { FinancialPostingService } from "./posting-engine";

const GST_RATE = 0.18;

const ACC = {
  BANK: "1000",
  AR: "1100",
  REVENUE: "4000",
  OUTPUT_GST: "2100",
} as const;

// The accounts these postings require. Most are seeded; Output GST is not, so we ensure it.
const CORE_ACCOUNTS = [
  { code: ACC.BANK, name: "Cash & Bank", type: "ASSET", normal: "DEBIT" },
  { code: ACC.AR, name: "Accounts Receivable", type: "ASSET", normal: "DEBIT" },
  { code: ACC.REVENUE, name: "Sales Revenue", type: "REVENUE", normal: "CREDIT" },
  { code: ACC.OUTPUT_GST, name: "Output GST Payable", type: "LIABILITY", normal: "CREDIT" },
] as const;

/** Idempotently ensure the ledger accounts the sales postings need exist for this business. */
export async function ensureSalesLedgerAccounts(businessId: string): Promise<void> {
  for (const a of CORE_ACCOUNTS) {
    await db.ledgerAccount.upsert({
      where: { businessId_accountCode: { businessId, accountCode: a.code } },
      update: {},
      create: { businessId, accountCode: a.code, name: a.name, accountType: a.type, normalBalance: a.normal },
    });
  }
}

/** Split a GST-inclusive total into taxable value + GST (reconciles exactly: taxable + gst = total). */
export function splitInclusiveGst(total: number): { taxable: number; gst: number } {
  const taxable = Math.round(total / (1 + GST_RATE));
  return { taxable, gst: total - taxable };
}

export async function postCustomerInvoiceJournal(p: {
  businessId: string;
  tenantId: string;
  invoiceId: string;
  code: string;
  total: number;
  date?: Date;
  approvedBy?: string;
}) {
  const { taxable, gst } = splitInclusiveGst(p.total);
  const lines: { accountCode: string; debit?: number; credit?: number }[] = [
    { accountCode: ACC.AR, debit: p.total },
    { accountCode: ACC.REVENUE, credit: taxable },
  ];
  if (gst > 0) lines.push({ accountCode: ACC.OUTPUT_GST, credit: gst });

  return FinancialPostingService.postEntry({
    businessId: p.businessId,
    tenantId: p.tenantId,
    description: `Customer invoice ${p.code}`,
    reference: p.code,
    sourceType: "CUSTOMER_INVOICE",
    sourceId: p.invoiceId,
    date: p.date,
    approvedBy: p.approvedBy,
    lines,
  });
}

export async function postCustomerPaymentJournal(p: {
  businessId: string;
  tenantId: string;
  invoiceId: string;
  code: string;
  amount: number;
  date?: Date;
  approvedBy?: string;
}) {
  return FinancialPostingService.postEntry({
    businessId: p.businessId,
    tenantId: p.tenantId,
    description: `Payment received for invoice ${p.code}`,
    reference: p.code,
    sourceType: "CUSTOMER_PAYMENT",
    sourceId: p.invoiceId,
    date: p.date,
    approvedBy: p.approvedBy,
    lines: [
      { accountCode: ACC.BANK, debit: p.amount },
      { accountCode: ACC.AR, credit: p.amount },
    ],
  });
}
