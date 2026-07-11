"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getBusinessId() {
  const { getActiveBusinessId } = await import("@/lib/server-auth");
  return getActiveBusinessId();
}

async function generateQuotationCode(businessId: string): Promise<string> {
  const count = await db.quotation.count({ where: { businessId } });
  return `QT-${String(count + 1).padStart(5, "0")}`;
}

export async function createQuotation(data: {
  customerId: string;
  validUntil?: Date;
  lines: { variantId: string; quantity: number; unitPrice: number }[];
}) {
  const businessId = await getBusinessId();
  const code = await generateQuotationCode(businessId);

  // Get business to get default currency
  const business = await db.business.findUnique({ where: { id: businessId } });
  if (!business?.defaultCurrencyId) {
    throw new Error("Business has no default currency. Please configure one first.");
  }

  let totalAmount = 0;
  const linesToCreate = data.lines.map(line => {
    const totalPrice = line.quantity * line.unitPrice;
    totalAmount += totalPrice;
    return {
      variantId: line.variantId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      totalPrice
    };
  });

  const quote = await db.quotation.create({
    data: {
      businessId,
      code,
      customerId: data.customerId,
      validUntil: data.validUntil,
      totalAmount,
      currencyId: business.defaultCurrencyId,
      status: "DRAFT",
      lines: {
        create: linesToCreate
      }
    }
  });

  revalidatePath("/sales/quotations");
  return quote;
}

export async function updateQuotationStatus(id: string, status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED") {
  const businessId = await getBusinessId();

  const quote = await db.quotation.update({
    where: { id, businessId },
    data: { status }
  });

  // Example Event Trigger Placeholder: QuotationAccepted
  if (status === "ACCEPTED") {
    // In event-sourcing world, we might publish this to outbox
    // For V1 MVP logic, this is just a status update
  }

  revalidatePath("/sales/quotations");
  return quote;
}

export async function getQuotations() {
  const businessId = await getBusinessId();
  return db.quotation.findMany({
    where: { businessId },
    include: {
      customer: true,
      lines: {
        include: { variant: { include: { product: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}
