export const dynamic = "force-dynamic";

import Link from "next/link";
import { FileText, Truck, Banknote, Users, Package, TrendingUp, BookOpen } from "lucide-react";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { EnterprisePage, EnterprisePageHeader } from "@/components/enterprise";

const REPORTS = [
  { href: "/sales/reports/invoices", title: "Invoice Register", desc: "All customer invoices with paid / balance / status.", icon: FileText },
  { href: "/sales/reports/shipments", title: "Shipment Register", desc: "Every shipment with order, warehouse and status.", icon: Truck },
  { href: "/sales/reports/payments", title: "Payment Register", desc: "Customer receipts by date, method and reference.", icon: Banknote },
  { href: "/sales/reports/customer-sales", title: "Customer Sales", desc: "Per-customer invoiced, received and outstanding.", icon: Users },
  { href: "/sales/reports/product-sales", title: "Product Sales", desc: "Quantity and revenue by product.", icon: Package },
  { href: "/sales/reports/margin", title: "Margin Report", desc: "Revenue, COGS and margin % by product.", icon: TrendingUp },
  { href: "/sales/customers", title: "Customer Ledger", desc: "Open a customer to view its full account statement.", icon: BookOpen },
];

export default async function SalesReportsHub() {
  await requireBusinessContext();
  await requirePermission("sales.read");

  return (
    <EnterprisePage>
      <EnterprisePageHeader title="Sales Reports" description="Registers and analytics across the sales workflow." />
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
