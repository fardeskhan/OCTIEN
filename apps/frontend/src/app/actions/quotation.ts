"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function generateQuotationCode(businessId: string): Promise<string> {
  const count = await db.quotation.count({ where: { businessId } });
  return `QT-${String(count + 1).padStart(5, "0")}`;
}

export async function createQuotation(data: {
  customerId: string;
  validUntil?: Date;
  lines: { variantId: string; quantity: number; unitPrice: number }[];
}) {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.write");

  if (!data.customerId) throw new Error("Select a customer");
  const customer = await db.customer.findFirst({ where: { id: data.customerId, businessId, deletedAt: null } });
  if (!customer) throw new Error("Customer not found in this business");

  const lines = data.lines.filter((l) => l.variantId && l.quantity > 0);
  if (lines.length === 0) throw new Error("Add at least one line item with a product and quantity");

  const business = await db.business.findUnique({ where: { id: businessId }, select: { defaultCurrencyId: true } });
  const currency = business?.defaultCurrencyId ? { id: business.defaultCurrencyId } : await db.currency.findFirst();
  if (!currency) throw new Error("Business has no default currency. Please configure one first.");

  const code = await generateQuotationCode(businessId);

  let totalAmount = 0;
  const linesToCreate = lines.map((line) => {
    const totalPrice = line.quantity * line.unitPrice;
    totalAmount += totalPrice;
    return { variantId: line.variantId, quantity: line.quantity, unitPrice: line.unitPrice, totalPrice };
  });

  const quote = await db.quotation.create({
    data: {
      businessId,
      code,
      customerId: data.customerId,
      validUntil: data.validUntil,
      totalAmount,
      currencyId: currency.id,
      status: "DRAFT",
      lines: { create: linesToCreate },
    },
  });

  await logAudit({ action: "create", resource: "quotation", resourceId: quote.id, metadata: { code, totalAmount, customer: customer.name } });
  revalidatePath("/sales/quotations");
  return quote;
}

export async function updateQuotationStatus(id: string, status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED") {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.write");

  const existing = await db.quotation.findFirst({ where: { id, businessId } });
  if (!existing) throw new Error("Quotation not found");

  const quote = await db.quotation.update({
    where: { id },
    data: { status, ...(status === "EXPIRED" ? { expiredAt: new Date() } : {}) },
  });

  await logAudit({ action: "status", resource: "quotation", resourceId: quote.id, metadata: { code: quote.code, from: existing.status, to: status } });
  revalidatePath("/sales/quotations");
  return quote;
}

export async function getQuotations() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");
  return db.quotation.findMany({
    where: { businessId },
    include: {
      customer: true,
      lines: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}
