export const dynamic = "force-dynamic";

import Link from "next/link";
import { ShoppingCart, PackageCheck, FileText, Banknote, TrendingUp, BookOpen, Layers, BarChart3 } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { EnterprisePage, EnterprisePageHeader } from "@/components/enterprise";

const REPORTS = [
  { href: "/procurement/reports/purchases", title: "Purchase Register", desc: "All purchase orders with supplier, total and status.", icon: ShoppingCart },
  { href: "/procurement/reports/receipts", title: "Goods Receipt Register", desc: "Every goods receipt against purchase orders.", icon: PackageCheck },
  { href: "/procurement/reports/vendor-bills", title: "Vendor Bill Register", desc: "Supplier bills with paid / balance / status.", icon: FileText },
  { href: "/procurement/reports/payments", title: "Vendor Payment Register", desc: "Supplier payments by date, method and reference.", icon: Banknote },
  { href: "/procurement/reports/supplier-spend", title: "Supplier Spend", desc: "Billed, paid and outstanding by supplier.", icon: TrendingUp },
  { href: "/procurement/aging", title: "AP Aging Report", desc: "Outstanding payables bucketed by days past due.", icon: Layers },
  { href: "/procurement/suppliers", title: "Vendor Ledger", desc: "Open a supplier to view its full account statement.", icon: BookOpen },
  { href: "/procurement/reports/summary", title: "Procurement Summary", desc: "Executive printable overview of purchasing & payables.", icon: BarChart3 },
];

export default async function ProcurementReportsHub() {
  await requireBusinessContext();
  await requirePermission("procurement.read");

  return (
    <EnterprisePage>
      <EnterprisePageHeader title="Procurement Reports" description="Registers and analytics across the procurement workflow." />
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
