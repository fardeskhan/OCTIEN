/**
 * Business logic: turn a persisted CustomerInvoice into a template-agnostic InvoiceDocument.
 * Templates never touch Prisma — they only ever see the returned InvoiceDocument.
 */
import { db } from "@/lib/db";
import type { InvoiceDocument } from "./types";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export async function buildInvoiceDocument(
  invoiceId: string,
  businessId: string,
): Promise<InvoiceDocument | null> {
  const inv = await db.customerInvoice.findFirst({
    where: { id: invoiceId, businessId, deletedAt: null },
    include: {
      lines: true,
      customer: { include: { contacts: true, addresses: true } },
      currency: true,
      business: true,
    },
  });
  if (!inv) return null;

  const primaryContact = inv.customer.contacts.find((c) => c.isPrimary) ?? inv.customer.contacts[0];
  const primaryAddress = inv.customer.addresses.find((a) => a.isPrimary) ?? inv.customer.addresses[0];

  const lineItems = inv.lines.map((l) => ({
    description: l.description,
    quantity: l.quantity.toNumber(),
    unitPrice: l.unitPrice.toNumber(),
    amount: l.totalPrice.toNumber(),
  }));

  const subtotal = lineItems.reduce((s, l) => s + l.amount, 0);
  const total = inv.totalAmount.toNumber();
  const paid = inv.paidAmount.toNumber();
  const balanceDue = inv.remainingAmount.toNumber();

  // GST breakdown derived from the (tax-inclusive) total. Reconciles exactly: taxable + cgst + sgst = total.
  const GST_RATE = 0.18;
  const taxableValue = Math.round(total / (1 + GST_RATE));
  const gst = total - taxableValue;
  const cgstAmount = Math.round(gst / 2);
  const sgstAmount = gst - cgstAmount;

  const issued = inv.createdAt;
  const due = new Date(issued);
  due.setDate(due.getDate() + 15);

  return {
    id: inv.id,
    number: inv.code,
    status: inv.status,
    issueDate: fmtDate(issued),
    dueDate: fmtDate(due),
    currencyCode: inv.currency?.code ?? "INR",
    seller: {
      name: inv.business.name,
      addressLines: ["COSMY Group", "India"],
    },
    billTo: {
      name: inv.customer.name,
      addressLines: primaryAddress?.addressLine ? [primaryAddress.addressLine] : [],
      email: primaryContact?.email ?? undefined,
      phone: primaryContact?.phone ?? undefined,
    },
    lineItems,
    totals: { subtotal, total, paid, balanceDue },
    taxSummary: {
      taxableValue,
      cgstRate: GST_RATE / 2,
      cgstAmount,
      sgstRate: GST_RATE / 2,
      sgstAmount,
    },
  };
}
