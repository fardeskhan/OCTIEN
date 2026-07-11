export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { buildInvoiceDocument } from "@/lib/invoice/build-invoice-document";
import { brandingFromBusiness, DEFAULT_BRANDING } from "@/lib/invoice/branding";
import { InvoicePreview } from "./invoice-preview";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");

  const doc = await buildInvoiceDocument(id, businessId);
  if (!doc) notFound();

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { name: true, slug: true, tagline: true, logoUrl: true, primaryColor: true, accentColor: true, footerNote: true, paymentInstructions: true },
  });
  const branding = business ? brandingFromBusiness(business) : DEFAULT_BRANDING;

  return <InvoicePreview doc={doc} branding={branding} />;
}
