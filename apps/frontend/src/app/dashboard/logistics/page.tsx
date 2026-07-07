// @ts-nocheck
import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/rbac";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function LogisticsDashboardPage() {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "logistics.read");

  const activeRuns = await db.deliveryRun.count({
    where: { businessId, status: "IN_TRANSIT" }
  });

  const scheduledRuns = await db.deliveryRun.count({
    where: { businessId, status: "SCHEDULED" }
  });

  const activeEwb = await db.eWayBill.count({
    where: { businessId, status: "GENERATED" }
  });

  const transportersCount = await db.transporter.count({
    where: { businessId }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Logistics & Compliance</h1>
          <p className="text-slate-500 mt-2">CAP-LOGISTICS V1 (RC3)</p>
        </div>
        <div className="space-x-4">
          <Link href="/dashboard/logistics/runs">
            <Button variant="outline">Delivery Runs</Button>
          </Link>
          <Link href="/dashboard/logistics/ewb">
            <Button variant="outline">E-Way Bills</Button>
          </Link>
          <Link href="/dashboard/logistics/transporters">
            <Button variant="outline">Fleet & Partners</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm border-slate-200/60 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              In-Transit Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{activeRuns}</div>
            <p className="text-xs text-blue-500 mt-1">Vehicles currently on the road</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Scheduled Dispatches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-700">{scheduledRuns}</div>
            <p className="text-xs text-slate-500 mt-1">Runs awaiting dispatch</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60 bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Active E-Way Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{activeEwb}</div>
            <p className="text-xs text-emerald-500 mt-1">Legally compliant dispatches</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Transporter Partners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-700">{transportersCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
