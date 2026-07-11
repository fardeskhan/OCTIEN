export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, Building2, Settings } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BusinessStatusControl } from "./business-status-control";

export default async function BusinessManagementPage() {
  const { tenantId } = await requireBusinessContext();

  const businesses = await db.business.findMany({
    where: { tenantId },
    include: { businessType: true, _count: { select: { memberships: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Businesses"
        description="Create, configure, and manage the businesses in your group."
        actions={
          <Link href="/business/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Create Business
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {businesses.map((b) => {
          const primary = b.primaryColor ?? "#1e293b";
          const accent = b.accentColor ?? "#0ea5e9";
          const monogram = b.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
          return (
            <Card key={b.id} className="overflow-hidden">
              <div className="flex items-center gap-3 p-4 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logoUrl} alt="" className="h-11 w-11 rounded bg-white/90 object-contain p-1" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded bg-white/20 text-sm font-bold">{monogram}</div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{b.name}</div>
                  <div className="truncate text-xs opacity-90">{b.tagline ?? b.businessType.name}</div>
                </div>
              </div>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between text-sm">
                  <Badge variant={b.status === "ACTIVE" ? "default" : b.status === "ARCHIVED" ? "secondary" : "warning"}>{b.status}</Badge>
                  <span className="text-muted-foreground">{b._count.memberships} member{b._count.memberships === 1 ? "" : "s"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Link href={`/business/${b.id}/settings`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <BusinessStatusControl id={b.id} status={b.status} />
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Link href="/business/new" className="flex min-h-[180px] items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
          <span className="flex flex-col items-center gap-2">
            <Building2 className="h-6 w-6" />
            <span className="text-sm font-medium">Create a new business</span>
          </span>
        </Link>
      </div>
    </WorkspaceLayout>
  );
}
