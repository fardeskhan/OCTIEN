export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { buttonVariants } from "@/components/ui/button";
import { QuotationCreateForm } from "./quotation-create-form";

export default async function NewQuotationPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.write");

  const [customers, variants] = await Promise.all([
    db.customer.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    db.productVariant.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true, name: true, price: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="New Quotation"
        description="Draft a customer quotation. Once accepted it can be converted into a sales order."
        actions={
          <Link href="/sales/quotations" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" /> Quotations
          </Link>
        }
      />
      <QuotationCreateForm customers={customers} variants={variants} />
    </WorkspaceLayout>
  );
}
