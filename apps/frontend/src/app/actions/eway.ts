"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getEWayBillProvider } from "@/lib/logistics/eway-provider";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/** Create a draft E-Way Bill against an invoice (no external call yet). */
export async function createEWayBill(invoiceId: string, opts?: { vehicleNumber?: string; transporterName?: string }) {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("logistics.write");

  const invoice = await db.customerInvoice.findFirst({ where: { id: invoiceId, businessId, deletedAt: null } });
  if (!invoice) throw new Error("Invoice not found");

  const draftNumber = `DRAFT-${invoice.code}-${Math.floor(1000 + Math.random() * 9000)}`;
  const ewb = await db.eWayBill.create({
    data: {
      businessId,
      ewbNumber: draftNumber,
      invoiceId: invoice.id,
      generationSource: "MANUAL",
      status: "DRAFT",
      vehicleNumber: opts?.vehicleNumber,
      transporterName: opts?.transporterName,
    },
  });

  await logAudit({ action: "create", resource: "eway_bill", resourceId: ewb.id, metadata: { invoice: invoice.code } });
  revalidatePath("/operations/logistics/ewb");
  return { id: ewb.id };
}

/** Generate the E-Way Bill via the configured provider (mock now, NIC later). */
export async function generateEWayBill(ewbId: string) {
  const { currentBusinessId: businessId, userId } = await requireBusinessContext();
  await requirePermission("logistics.write");

  const ewb = await db.eWayBill.findFirst({ where: { id: ewbId, businessId } });
  if (!ewb) throw new Error("E-Way Bill not found");
  const invoice = await db.customerInvoice.findFirst({ where: { id: ewb.invoiceId, businessId } });

  const provider = getEWayBillProvider();
  const result = await provider.generate({
    invoiceCode: invoice?.code ?? "",
    invoiceAmount: invoice?.totalAmount.toNumber() ?? 0,
    vehicleNumber: ewb.vehicleNumber ?? undefined,
    transporterName: ewb.transporterName ?? undefined,
  });

  if (result.status === "FAILED") {
    await db.eWayBill.update({ where: { id: ewb.id }, data: { status: "FAILED", lastError: result.error, generationAttempts: { increment: 1 } } });
    throw new Error(result.error ?? "E-Way Bill generation failed");
  }

  await db.eWayBill.update({
    where: { id: ewb.id },
    data: {
      ewbNumber: result.ewbNumber,
      status: "GENERATED",
      validFrom: result.validFrom,
      validUntil: result.validUntil,
      generatedBy: userId,
      generationAttempts: { increment: 1 },
      lastError: null,
      generationSource: provider.name === "nic" ? "NIC_API" : "MANUAL",
    },
  });

  await logAudit({ action: "generate", resource: "eway_bill", resourceId: ewb.id, metadata: { ewbNumber: result.ewbNumber, provider: provider.name } });
  revalidatePath("/operations/logistics/ewb");
  return { success: true };
}

/** Edit the transport details on an E-Way Bill (allowed before it is generated). */
export async function editEWayBill(ewbId: string, data: { vehicleNumber?: string; transporterName?: string }) {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("logistics.write");

  const ewb = await db.eWayBill.findFirst({ where: { id: ewbId, businessId } });
  if (!ewb) throw new Error("E-Way Bill not found");
  if (ewb.status === "GENERATED" || ewb.status === "CANCELLED") throw new Error("Only draft/pending E-Way Bills can be edited");

  await db.eWayBill.update({
    where: { id: ewb.id },
    data: { vehicleNumber: data.vehicleNumber?.trim() || null, transporterName: data.transporterName?.trim() || null },
  });
  revalidatePath("/operations/logistics/ewb");
  return { success: true };
}

export async function cancelEWayBill(ewbId: string, reason: string) {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("logistics.write");

  const ewb = await db.eWayBill.findFirst({ where: { id: ewbId, businessId } });
  if (!ewb) throw new Error("E-Way Bill not found");

  const provider = getEWayBillProvider();
  const result = await provider.cancel(ewb.ewbNumber, reason);
  if (result.status === "FAILED") throw new Error(result.error ?? "Cancellation failed");

  await db.eWayBill.update({ where: { id: ewb.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason } });
  await logAudit({ action: "cancel", resource: "eway_bill", resourceId: ewb.id, metadata: { ewbNumber: ewb.ewbNumber, reason } });
  revalidatePath("/operations/logistics/ewb");
  return { success: true };
}
