export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getProcurementDashboard } from "@/lib/procurement/procurement-dashboard";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardBarChart } from "@/components/ui/chart-wrappers";
import { formatINR } from "@/lib/currency";
import { branding } from "@/lib/branding";
import {
  EnterprisePage,
  EnterprisePageHeader,
  EnterpriseKPIRow,
  EnterpriseStatCard,
  EnterprisePrintButton,
} from "@/components/enterprise";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="truncate pr-2 font-medium">{label}</span>
      <span className="tabular-nums text-muted-foreground">{value}</span>
    </div>
  );
}

export default async function ProcurementSummaryPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");

  const [d, business] = await Promise.all([
    getProcurementDashboard(businessId),
    db.business.findUnique({ where: { id: businessId }, select: { name: true } }),
  ]);
  const { kpis, aging } = d;

  const distribution = [
    { bucket: "Current", amount: Math.round(aging.totals.current) },
    { bucket: "1–30", amount: Math.round(aging.totals.d1_30) },
    { bucket: "31–60", amount: Math.round(aging.totals.d31_60) },
    { bucket: "61–90", amount: Math.round(aging.totals.d61_90) },
    { bucket: "91–120", amount: Math.round(aging.totals.d91_120) },
    { bucket: "120+", amount: Math.round(aging.totals.d120plus) },
  ];

  return (
    <EnterprisePage>
      <EnterprisePageHeader
        title="Procurement Summary"
        description={`${business?.name ?? branding.productName} · executive procurement overview`}
        actions={
          <div className="flex items-center gap-2">
            <EnterprisePrintButton />
            <Link href="/procurement/reports" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="h-4 w-4" /> Reports
            </Link>
          </div>
        }
      />

      <EnterpriseKPIRow className="lg:grid-cols-4">
        <EnterpriseStatCard title="Purchase Spend" value={formatINR(kpis.purchaseSpend)} />
        <EnterpriseStatCard title="Payments" value={formatINR(kpis.payments)} />
        <EnterpriseStatCard title="Outstanding AP" value={formatINR(kpis.outstandingAP)} />
        <EnterpriseStatCard title="Overdue AP" value={formatINR(kpis.overdueAP)} variant={kpis.overdueAP > 0 ? "destructive" : "default"} />
      </EnterpriseKPIRow>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StandardBarChart title="Monthly purchases" data={d.trends} xAxisKey="month" series={[{ key: "purchases", color: "var(--primary)" }]} height={220} />
        <StandardBarChart title="Monthly payments" data={d.trends} xAxisKey="month" series={[{ key: "paid", color: "var(--success)" }]} height={220} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Top suppliers (spend)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {d.topSuppliers.length === 0 ? <p className="text-sm text-muted-foreground">No data.</p> : d.topSuppliers.map((s) => <Row key={s.name} label={s.name} value={formatINR(s.amount)} />)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Largest outstanding</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {d.largestOutstanding.length === 0 ? <p className="text-sm text-muted-foreground">No data.</p> : d.largestOutstanding.map((s) => <Row key={s.name} label={s.name} value={formatINR(s.amount)} />)}
          </CardContent>
        </Card>
        <StandardBarChart title="AP aging" data={distribution} xAxisKey="bucket" series={[{ key: "amount", color: "var(--primary)" }]} height={220} />
      </div>
    </EnterprisePage>
  );
}
