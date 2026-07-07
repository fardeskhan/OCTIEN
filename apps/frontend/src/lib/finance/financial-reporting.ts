import { db } from "@/lib/db";
import { Prisma, AccountTypeEnum, NormalBalance } from "@prisma/client";

export interface TrialBalanceRow {
    accountId: string;
    accountCode: string;
    accountName: string;
    accountType: AccountTypeEnum;
    normalBalance: NormalBalance;
    parentAccountId: string | null;
    openingBalance: number;
    periodDebits: number;
    periodCredits: number;
    closingBalance: number;
}

export interface FinancialReportMetadata {
    statementDate: Date;
    statementPeriod?: { start: Date; end: Date };
    generatedAt: Date;
    generatedBy: string;
}

export interface TrialBalanceReport {
    metadata: FinancialReportMetadata;
    rows: TrialBalanceRow[];
    totalDebitNormal: number;
    totalCreditNormal: number;
    isValid: boolean;
}

export interface PLSection {
    accounts: TrialBalanceRow[];
    total: number;
}

export interface ProfitAndLossReport {
    metadata: FinancialReportMetadata;
    revenue: PLSection;
    expenses: PLSection;
    netProfit: number;
}

export interface BalanceSheetReport {
    metadata: FinancialReportMetadata;
    assets: PLSection;
    liabilities: PLSection;
    equity: PLSection & { currentPeriodProfit: number };
    totalAssets: number;
    totalLiabilitiesAndEquity: number;
}

export interface AccountNode extends TrialBalanceRow {
    children: AccountNode[];
    rollupBalance: number;
}

export class FinancialReportingService {
    
    /**
     * Internal helper to compute balance based on normal balance rules.
     */
    private static computeBalance(normalBalance: NormalBalance, debits: number, credits: number): number {
        if (normalBalance === "DEBIT") {
            return debits - credits;
        } else {
            return credits - debits;
        }
    }

    /**
     * Get Trial Balance for a given period.
     */
    public static async getTrialBalance(
        businessId: string, 
        generatedBy: string,
        startDate?: Date,
        endDate?: Date,
        costCenterIds?: string[],
        skipOpeningBalances: boolean = false
    ): Promise<TrialBalanceReport> {
        
        // 1. Fetch all accounts
        const accounts = await db.ledgerAccount.findMany({
            where: { businessId },
            orderBy: { accountCode: "asc" }
        });

        // 2. Fetch Opening Balances (groupBy accountId)
        let openingGroups: any[] = [];
        if (startDate && !skipOpeningBalances) {
            const openingWhere: Prisma.JournalLineWhereInput = {
                journalEntry: { businessId, date: { lt: startDate } }
            };
            if (costCenterIds) openingWhere.costCenterId = { in: costCenterIds };
            
            // @ts-ignore
            openingGroups = await (db.journalLine.groupBy as any)({
                by: [Prisma.JournalLineScalarFieldEnum.accountId],
                where: openingWhere,
                _sum: { debit: true, credit: true }
            });
        }

        // 3. Fetch Period Activity (groupBy accountId)
        const periodWhere: Prisma.JournalLineWhereInput = {
            journalEntry: { businessId }
        };
        if (startDate) periodWhere.journalEntry!.date = { ...periodWhere.journalEntry?.date as object, gte: startDate };
        if (endDate) periodWhere.journalEntry!.date = { ...periodWhere.journalEntry?.date as object, lte: endDate };
        if (costCenterIds) periodWhere.costCenterId = { in: costCenterIds };

        // @ts-ignore
        const periodGroups = await (db.journalLine.groupBy as any)({
            by: [Prisma.JournalLineScalarFieldEnum.accountId],
            where: periodWhere,
            _sum: { debit: true, credit: true }
        });

        const rows: TrialBalanceRow[] = [];
        let totalDebitNormal = 0;
        let totalCreditNormal = 0;

        for (const account of accounts) {
            const openGroup = openingGroups.find((g: any) => g.accountId === account.id);
            const periodGroup = periodGroups.find((g: any) => g.accountId === account.id);

            const openingDebits = openGroup?._sum?.debit ? Number(openGroup._sum.debit) : 0;
            const openingCredits = openGroup?._sum?.credit ? Number(openGroup._sum.credit) : 0;
            const openingBalance = this.computeBalance(account.normalBalance, openingDebits, openingCredits);

            const periodDebits = periodGroup?._sum?.debit ? Number(periodGroup._sum.debit) : 0;
            const periodCredits = periodGroup?._sum?.credit ? Number(periodGroup._sum.credit) : 0;
            const periodActivity = this.computeBalance(account.normalBalance, periodDebits, periodCredits);

            const closingBalance = openingBalance + periodActivity;

            if (account.normalBalance === "DEBIT") {
                totalDebitNormal += closingBalance;
            } else {
                totalCreditNormal += closingBalance;
            }

            rows.push({
                accountId: account.id,
                accountCode: account.accountCode,
                accountName: account.name,
                accountType: account.accountType,
                normalBalance: account.normalBalance,
                parentAccountId: account.parentAccountId,
                openingBalance,
                periodDebits,
                periodCredits,
                closingBalance
            });
        }

        // Floating point precision fix
        const isValid = Math.abs(totalDebitNormal - totalCreditNormal) < 0.001;

        return {
            metadata: {
                statementDate: endDate || new Date(),
                statementPeriod: (startDate && endDate) ? { start: startDate, end: endDate } : undefined,
                generatedAt: new Date(),
                generatedBy
            },
            rows,
            totalDebitNormal,
            totalCreditNormal,
            isValid
        };
    }

    /**
     * Get Profit and Loss Statement
     */
    public static async getProfitAndLoss(
        businessId: string,
        generatedBy: string,
        startDate?: Date,
        endDate?: Date,
        costCenterIds?: string[]
    ): Promise<ProfitAndLossReport> {
        const tb = await this.getTrialBalance(businessId, generatedBy, startDate, endDate, costCenterIds, true);

        const revenueAccounts = tb.rows.filter(r => r.accountType === "REVENUE");
        const expenseAccounts = tb.rows.filter(r => r.accountType === "EXPENSE");

        const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + (acc.normalBalance === "CREDIT" ? acc.periodCredits - acc.periodDebits : acc.periodDebits - acc.periodCredits), 0);
        const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + (acc.normalBalance === "DEBIT" ? acc.periodDebits - acc.periodCredits : acc.periodCredits - acc.periodDebits), 0);

        return {
            metadata: tb.metadata,
            revenue: { accounts: revenueAccounts, total: totalRevenue },
            expenses: { accounts: expenseAccounts, total: totalExpenses },
            netProfit: totalRevenue - totalExpenses
        };
    }

    /**
     * Get Balance Sheet
     */
    public static async getBalanceSheet(
        businessId: string,
        generatedBy: string,
        startDate?: Date, // Usually irrelevant for BS, but included for complete TB derivation
        endDate?: Date
    ): Promise<BalanceSheetReport> {
        const tb = await this.getTrialBalance(businessId, generatedBy, startDate, endDate);
        const pl = await this.getProfitAndLoss(businessId, generatedBy, startDate, endDate);

        const assetAccounts = tb.rows.filter(r => r.accountType === "ASSET");
        const liabilityAccounts = tb.rows.filter(r => r.accountType === "LIABILITY");
        const equityAccounts = tb.rows.filter(r => r.accountType === "EQUITY");

        const totalAssets = assetAccounts.reduce((sum, acc) => sum + acc.closingBalance, 0);
        const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + acc.closingBalance, 0);
        const baseEquity = equityAccounts.reduce((sum, acc) => sum + acc.closingBalance, 0);
        const totalEquity = baseEquity + pl.netProfit;

        return {
            metadata: tb.metadata,
            assets: { accounts: assetAccounts, total: totalAssets },
            liabilities: { accounts: liabilityAccounts, total: totalLiabilities },
            equity: { accounts: equityAccounts, total: totalEquity, currentPeriodProfit: pl.netProfit },
            totalAssets,
            totalLiabilitiesAndEquity: totalLiabilities + totalEquity
        };
    }

    /**
     * Build Account Hierarchy from a Trial Balance
     */
    public static getAccountHierarchy(tbRows: TrialBalanceRow[]): AccountNode[] {
        const nodeMap = new Map<string, AccountNode>();
        const roots: AccountNode[] = [];

        // Initialize nodes
        for (const row of tbRows) {
            nodeMap.set(row.accountId, { ...row, children: [], rollupBalance: row.closingBalance });
        }

        // Build tree
        for (const node of nodeMap.values()) {
            if (node.parentAccountId && nodeMap.has(node.parentAccountId)) {
                nodeMap.get(node.parentAccountId)!.children.push(node);
            } else {
                roots.push(node);
            }
        }

        // Compute rollups post-order
        const computeRollup = (n: AccountNode): number => {
            let sum = n.closingBalance;
            for (const c of n.children) {
                sum += computeRollup(c);
            }
            n.rollupBalance = sum;
            return sum;
        };

        for (const r of roots) {
            computeRollup(r);
        }

        return roots;
    }

    /**
     * Get a single account's balance
     */
    public static async getAccountBalance(businessId: string, accountId: string): Promise<number> {
        const account = await db.ledgerAccount.findUnique({ where: { id: accountId } });
        if (!account) throw new Error("Account not found");

        const agg = await db.journalLine.aggregate({
            where: { accountId: account.id, journalEntry: { businessId } },
            _sum: { debit: true, credit: true }
        });

        const debits = agg._sum.debit ? agg._sum.debit.toNumber() : 0;
        const credits = agg._sum.credit ? agg._sum.credit.toNumber() : 0;

        return this.computeBalance(account.normalBalance, debits, credits);
    }
}
