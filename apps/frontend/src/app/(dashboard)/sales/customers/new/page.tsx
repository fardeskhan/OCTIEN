export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { buttonVariants } from "@/components/ui/button";
import { CustomerCreateForm } from "./customer-create-form";

export default async function NewCustomerPage() {
  await requireBusinessContext();
  await requirePermission("sales.write");

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="New Customer"
        description="Add a customer to this business."
        actions={
          <Link href="/sales/customers" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" /> Customers
          </Link>
        }
      />
      <CustomerCreateForm />
    </WorkspaceLayout>
  );
}
