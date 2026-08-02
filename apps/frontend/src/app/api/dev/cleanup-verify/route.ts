import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Dev-only: remove artifacts left by manual runtime verification (throwaway warehouses and an
 * optionally-specified test quotation + its audit rows). Disabled in production.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const url = new URL(request.url);
  const quotationId = url.searchParams.get("quotationId") ?? undefined;
  const invoiceId = url.searchParams.get("invoiceId") ?? undefined;
  const result: Record<string, unknown> = {};

  result.warehouses = (await db.warehouse.deleteMany({ where: { code: "WH-VERIFY" } })).count;

  if (quotationId) {
    result.quotationAudit = (await db.auditLog.deleteMany({ where: { resource: "quotation", resourceId: quotationId } })).count;
    result.quotation = (await db.quotation.deleteMany({ where: { id: quotationId } })).count;
  }

  if (invoiceId) {
    result.invoiceJournals = (await db.journalEntry.deleteMany({ where: { sourceId: invoiceId } })).count;
    result.invoiceReceivables = (await db.receivableEntry.deleteMany({ where: { sourceType: "CUSTOMER_INVOICE", sourceId: invoiceId } })).count;
    result.invoiceAudit = (await db.auditLog.deleteMany({ where: { resource: "invoice", resourceId: invoiceId } })).count;
    result.invoice = (await db.customerInvoice.deleteMany({ where: { id: invoiceId } })).count;
  }

  return NextResponse.json(result);
}
