export const dynamic = "force-dynamic";

import Link from "next/link";
import { getExecutiveDashboard } from "@/app/actions/report";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Boxes, ShoppingCart, LayoutDashboard } from "lucide-react";

const REPORTS = [
  { title: "Executive Dashboard", href: "/", icon: LayoutDashboard, desc: "Consolidated group KPIs" },
  { title: "Inventory Report", href: "/inventory/valuation", icon: Boxes, desc: "Stock value & movement" },
  { title: "Procurement Report", href: "/operations/procurement/dashboard", icon: ShoppingCart, desc: "Supplier spend & POs" },
];

export default async function ReportsPage() {
  const dash = await getExecutiveDashboard().catch(() => null);

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Reports"
        description="Operational and financial reporting projections."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Inventory Value" value={formatINR(Number(dash?.totalInventoryVal ?? 0))} freshness="Projection" />
        <KPICard title="Open PO Amount" value={formatINR(Number(dash?.openPOAmount ?? 0))} freshness="Projection" />
        <KPICard title="Active Suppliers" value={Number(dash?.activeSuppliers ?? 0)} freshness="Projection" />
        <KPICard title="Pending Receipts" value={Number(dash?.pendingReceipts ?? 0)} freshness="Projection" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <Link key={r.title} href={r.href}>
            <Card className="h-full hover:shadow-md hover:border-primary/40 transition-all">
              <CardContent className="p-4 flex flex-col gap-2">
                <r.icon className="h-5 w-5 text-muted-foreground" />
                <div className="text-sm font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Reporting projections populate once transactional data and dashboard recalculation have run for the
        active business.
      </p>
    </WorkspaceLayout>
  );
}
