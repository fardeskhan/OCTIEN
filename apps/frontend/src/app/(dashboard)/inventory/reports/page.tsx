export const dynamic = "force-dynamic";

import Link from "next/link";
import { Warehouse, Wallet, ArrowLeftRight, Snail, Rabbit, Lock, AlertOctagon, BarChart3 } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { EnterprisePage, EnterprisePageHeader } from "@/components/enterprise";

const REPORTS = [
  { href: "/inventory/reports/warehouse-stock", title: "Warehouse Stock", desc: "On-hand / reserved / available / value by variant and warehouse.", icon: Warehouse },
  { href: "/inventory/reports/valuation", title: "Inventory Valuation", desc: "Stock value by variant at moving average cost.", icon: Wallet },
  { href: "/inventory/movements", title: "Movement Register", desc: "Every stock movement with type, quantity and reference.", icon: ArrowLeftRight },
  { href: "/inventory/reports/slow-moving", title: "Slow-Moving", desc: "Stock ranked by days since last movement.", icon: Snail },
  { href: "/inventory/reports/fast-moving", title: "Fast-Moving", desc: "Stock ranked by 30-day outbound velocity.", icon: Rabbit },
  { href: "/inventory/reports/reserved", title: "Reserved Stock", desc: "Lines currently holding an active reservation.", icon: Lock },
  { href: "/inventory/reports/negative", title: "Negative Stock", desc: "Data-integrity guard: any line below zero.", icon: AlertOctagon },
  { href: "/inventory/reports/summary", title: "Inventory Summary", desc: "Executive printable overview of stock and valuation.", icon: BarChart3 },
];

export default async function InventoryReportsHub() {
  await requireBusinessContext();
  await requirePermission("inventory.read");

  return (
    <EnterprisePage>
      <EnterprisePageHeader title="Inventory Reports" description="Registers and analytics across the inventory position." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
              <CardContent className="flex items-start gap-3 pt-6">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <r.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">{r.title}</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{r.desc}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </EnterprisePage>
  );
}
