export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { buttonVariants } from "@/components/ui/button";
import { BusinessForm } from "../business-form";

export default async function NewBusinessPage() {
  await requireRole("Owner");

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Create Business"
        description="Add a new business to your group. It becomes switchable and dashboard-ready immediately."
        actions={
          <Link href="/business" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" /> Businesses
          </Link>
        }
      />
      <BusinessForm mode="create" />
    </WorkspaceLayout>
  );
}
