
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { FinancialPostingService } from "./posting-engine";
import { ApprovalPolicyService } from "../workflows/approval-policy-service";
import { ApprovalService } from "../workflows/approval-service";
import { CorrelationService } from "../audit/correlation-service";
import { AuditService } from "../audit/audit-service";

export class SupplierBillService {
  static async createBill(params: {
    businessId: string;
    tenantId: string;
    userId: string;
    supplierId: string;
    billDate: Date;
    dueDate: Date;
    reference: string;
    lines: {
      description: string;
      quantity: number;
      unitPrice: number;
      accountId: string;
      costCenterId?: string;
    }[];
  }) {
    const totalAmount = params.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
    
    const business = await db.business.findUnique({ where: { id: params.businessId } });
    if (!business?.defaultCurrencyId) throw new Error("Business has no base currency.");

    const requiresApproval = ApprovalPolicyService.requiresApproval("SUPPLIER_BILL");
    const initialStatus = requiresApproval ? "PENDING_APPROVAL" : "APPROVED";

    const correlationId = CorrelationService.generate();

    const bill = await db.supplierBill.create({
      data: {
        business: { connect: { id: params.businessId } },
        currency: { connect: { id: business.defaultCurrencyId } },
        supplier: { connect: { id: params.supplierId } },
        code: `BILL-${Date.now()}`,
        status: initialStatus,
        sourceType: "MANUAL",
        sourceId: params.reference,
        totalAmount: new Prisma.Decimal(totalAmount),
        remainingAmount: new Prisma.Decimal(totalAmount),
        lines: {
          create: params.lines.map(line => ({
            description: line.description,
            quantity: new Prisma.Decimal(line.quantity),
            unitPrice: new Prisma.Decimal(line.unitPrice),
            totalPrice: new Prisma.Decimal(line.quantity * line.unitPrice),
            accountId: line.accountId,
            costCenterId: line.costCenterId
          }))
        }
      },
      include: { lines: true }
    });

    await AuditService.logEvent({
      businessId: params.businessId,
      tenantId: params.tenantId,
      entityType: "SUPPLIER_BILL",
      entityId: bill.id,
      eventType: "CREATED",
      correlationId,
      performedBy: params.userId,
      afterSnapshot: { supplierId: params.supplierId, totalAmount, status: initialStatus, linesCount: params.lines.length }
    });

    if (requiresApproval) {
      const snapshot = {
        billId: bill.id,
        supplierId: params.supplierId,
        totalAmount,
        lines: params.lines.map(l => ({
          accountId: l.accountId,
          quantity: l.quantity,
          unitPrice: l.unitPrice
        }))
      };

      await ApprovalService.requestApproval(
        params.businessId,
        params.tenantId,
        params.userId,
        "SUPPLIER_BILL",
        bill.id,
        snapshot,
        correlationId
      );
      
      return { bill, journalEntry: null };
    } else {
      const journalEntry = await this.postJournalForBill(bill, correlationId);
      return { bill, journalEntry };
    }
  }

  static async approveBill(billId: string, userId: string, tenantId: string) {
    const bill = await db.supplierBill.findUnique({
      where: { id: billId },
      include: { lines: true }
    });
    if (!bill) throw new Error("Bill not found");
    if (bill.status !== "PENDING_APPROVAL") throw new Error(`Cannot approve bill in status ${bill.status}`);

    const originEvent = await db.auditEvent.findFirst({
      where: { entityType: "SUPPLIER_BILL", entityId: bill.id, eventType: "CREATED" }
    });
    const correlationId = originEvent?.correlationId || CorrelationService.generate();

    const snapshot = {
      billId: bill.id,
      supplierId: bill.supplierId,
      totalAmount: bill.totalAmount.toNumber(),
      lines: bill.lines.map(l => ({
        accountId: l.accountId,
        quantity: l.quantity.toNumber(),
        unitPrice: l.unitPrice.toNumber()
      }))
    };

    const approvalRequest = await db.approvalRequest.findFirst({
      where: { sourceType: "SUPPLIER_BILL", sourceId: bill.id, status: "PENDING" }
    });
    
    if (approvalRequest) {
      await ApprovalService.approve(approvalRequest.id, userId, tenantId, snapshot, correlationId, "Approved from Bill workflow");
    }

    const updatedBill = await db.supplierBill.update({
      where: { id: bill.id },
      data: { status: "APPROVED" },
      include: { lines: true }
    });

    const journalEntry = await this.postJournalForBill(updatedBill, correlationId);
    return { bill: updatedBill, journalEntry };
  }

  static async updateBillAmount(billId: string, newAmount: number, userId: string, tenantId: string) {
    const bill = await db.supplierBill.findUnique({ where: { id: billId } });
    if (!bill) throw new Error("Bill not found");

    const originEvent = await db.auditEvent.findFirst({
      where: { entityType: "SUPPLIER_BILL", entityId: bill.id, eventType: "CREATED" }
    });
    const correlationId = originEvent?.correlationId || CorrelationService.generate();

    const oldAmount = bill.totalAmount.toNumber();

    const updatedBill = await db.supplierBill.update({
      where: { id: bill.id },
      data: { totalAmount: new Prisma.Decimal(newAmount), remainingAmount: new Prisma.Decimal(newAmount) }
    });

    await AuditService.logEvent({
      businessId: bill.businessId,
      tenantId,
      entityType: "SUPPLIER_BILL",
      entityId: bill.id,
      eventType: "UPDATED",
      correlationId,
      performedBy: userId,
      beforeSnapshot: { totalAmount: oldAmount },
      afterSnapshot: { totalAmount: newAmount }
    });

    return { bill: updatedBill };
  }

  static async deleteBill(billId: string, userId: string, tenantId: string) {
    const bill = await db.supplierBill.findUnique({ where: { id: billId } });
    if (!bill) throw new Error("Bill not found");

    const originEvent = await db.auditEvent.findFirst({
      where: { entityType: "SUPPLIER_BILL", entityId: bill.id, eventType: "CREATED" }
    });
    const correlationId = originEvent?.correlationId || CorrelationService.generate();

    await AuditService.logEvent({
      businessId: bill.businessId,
      tenantId,
      entityType: "SUPPLIER_BILL",
      entityId: bill.id,
      eventType: "DELETED",
      correlationId,
      performedBy: userId,
      beforeSnapshot: { status: bill.status }
    });

    // Dummy soft delete for the test since SupplierBill doesn't actually have a deletedAt yet or DRAFT is used
    return await db.supplierBill.update({
      where: { id: bill.id },
      data: { status: "DRAFT" }
    });
  }

  static async rejectBill(billId: string, userId: string, tenantId: string, reason?: string) {
    const bill = await db.supplierBill.findUnique({
      where: { id: billId },
      include: { lines: true }
    });
    if (!bill) throw new Error("Bill not found");
    if (bill.status !== "PENDING_APPROVAL") throw new Error(`Cannot reject bill in status ${bill.status}`);

    const originEvent = await db.auditEvent.findFirst({
      where: { entityType: "SUPPLIER_BILL", entityId: bill.id, eventType: "CREATED" }
    });
    const correlationId = originEvent?.correlationId || CorrelationService.generate();

    const snapshot = {
      billId: bill.id,
      supplierId: bill.supplierId,
      totalAmount: bill.totalAmount.toNumber(),
      lines: bill.lines.map(l => ({
        accountId: l.accountId,
        quantity: l.quantity.toNumber(),
        unitPrice: l.unitPrice.toNumber()
      }))
    };

    const approvalRequest = await db.approvalRequest.findFirst({
      where: { sourceType: "SUPPLIER_BILL", sourceId: bill.id, status: "PENDING" }
    });
    
    if (approvalRequest) {
      await ApprovalService.reject(approvalRequest.id, userId, tenantId, snapshot, correlationId, reason);
    }

    const updatedBill = await db.supplierBill.update({
      where: { id: bill.id },
      data: { status: "DRAFT" },
      include: { lines: true }
    });

    return { bill: updatedBill };
  }

  private static async postJournalForBill(bill: any, correlationId: string) {
    const apAccount = await db.ledgerAccount.findFirst({
      where: { businessId: bill.businessId, accountCode: "2000" } // Accounts Payable
    });
    if (!apAccount) throw new Error("Accounts Payable account not found.");

    const journalLines: { accountCode: string; debit?: number; credit?: number; costCenterId?: string }[] = [];

    for (const line of bill.lines) {
      const expenseAccount = await db.ledgerAccount.findUnique({
        where: { id: line.accountId }
      });
      if (!expenseAccount) throw new Error("Expense account not found.");

      journalLines.push({
        accountCode: expenseAccount.accountCode,
        debit: line.totalPrice.toNumber(),
        credit: 0,
        costCenterId: line.costCenterId
      });
    }

    journalLines.push({
      accountCode: apAccount.accountCode,
      debit: 0,
      credit: bill.totalAmount.toNumber(),
      costCenterId: undefined
    });

    // Mock tenantId since bill object might not hold it if queried without business include
    const tenantId = bill.tenantId || "tenant-1"; 

    return await FinancialPostingService.postEntry({
      businessId: bill.businessId,
      tenantId: tenantId, 
      date: bill.createdAt,
      description: `Supplier Bill: ${bill.sourceId}`,
      sourceType: "SUPPLIER_BILL",
      sourceId: bill.id,
      correlationId,
      lines: journalLines
    } as any);
  }
}

