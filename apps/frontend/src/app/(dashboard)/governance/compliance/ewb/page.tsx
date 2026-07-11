export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export default async function EwbCompliancePage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("governance.read");

  const bills = await db.eWayBill.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } });
  const byStatus = (s: string) => bills.filter((b) => b.status === s).length;
  const generated = byStatus("GENERATED");
  const compliancePct = bills.length ? Math.round((generated / bills.length) * 100) : 100;
  const expiringSoon = bills.filter((b) => b.status === "GENERATED" && b.validUntil && b.validUntil.getTime() - Date.now() < 3 * 86400000);

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="E-Way Bill Compliance"
        description="Coverage and validity of E-Way bills for this business."
        actions={<Link href="/operations/logistics/ewb" className={buttonVariants({ variant: "outline", size: "sm" })}>Manage E-Way Bills</Link>}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard title="Compliance" value={`${compliancePct}%`} variant={compliancePct >= 80 ? "success" : "warning"} freshness="Live" />
        <KPICard title="Generated" value={generated} freshness="Live" />
        <KPICard title="Draft / Pending" value={byStatus("DRAFT") + byStatus("PENDING")} variant="warning" freshness="Live" />
        <KPICard title="Cancelled / Expired" value={byStatus("CANCELLED") + byStatus("EXPIRED")} freshness="Live" />
        <KPICard title="Expiring < 3 days" value={expiringSoon.length} variant={expiringSoon.length ? "warning" : "success"} freshness="Live" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">EWB Number</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Valid Until</th>
                <th className="p-3 font-medium">Vehicle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bills.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No E-Way bills for this business.</td></tr>
              ) : (
                bills.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{b.ewbNumber}</td>
                    <td className="p-3"><Badge variant={b.status === "GENERATED" ? "default" : b.status === "DRAFT" || b.status === "PENDING" ? "warning" : "destructive"}>{b.status}</Badge></td>
                    <td className="p-3 text-muted-foreground">{b.validUntil ? b.validUntil.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="p-3 font-mono text-xs">{b.vehicleNumber ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}
