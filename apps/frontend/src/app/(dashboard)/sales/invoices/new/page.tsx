export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { buttonVariants } from "@/components/ui/button";
import { InvoiceCreateForm } from "./invoice-create-form";

export default async function NewInvoicePage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.write");

  const [customers, variants] = await Promise.all([
    db.customer.findMany({ where: { businessId, deletedAt: null }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    db.productVariant.findMany({ where: { businessId, deletedAt: null }, select: { name: true, price: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="New Invoice"
        description="Create a customer invoice. It posts to receivables and can be previewed, printed, and downloaded."
        actions={
          <Link href="/sales/invoices" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" /> Invoices
          </Link>
        }
      />
      <InvoiceCreateForm
        customers={customers}
        products={variants.map((v) => ({ name: v.name, price: v.price }))}
      />
    </WorkspaceLayout>
  );
}
