export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext, requireRole } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BusinessForm } from "../../business-form";
import { BusinessStatusControl } from "../../business-status-control";

export default async function BusinessSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("Owner");
  const { tenantId } = await requireBusinessContext();

  const b = await db.business.findFirst({ where: { id, tenantId } });
  if (!b) notFound();

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title={b.name}
        description="Business profile, branding, and status."
        actions={
          <div className="flex items-center gap-3">
            <Badge variant={b.status === "ACTIVE" ? "default" : b.status === "ARCHIVED" ? "secondary" : "warning"}>{b.status}</Badge>
            <BusinessStatusControl id={b.id} status={b.status} />
            <Link href="/business" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="h-4 w-4" /> Businesses
            </Link>
          </div>
        }
      />
      <BusinessForm
        mode="edit"
        initial={{
          id: b.id,
          name: b.name,
          legalName: b.legalName,
          tagline: b.tagline,
          email: b.email,
          phone: b.phone,
          addressLine: b.addressLine,
          taxId: b.taxId,
          primaryColor: b.primaryColor,
          accentColor: b.accentColor,
          footerNote: b.footerNote,
          paymentInstructions: b.paymentInstructions,
          logoUrl: b.logoUrl,
        }}
      />
    </WorkspaceLayout>
  );
}
