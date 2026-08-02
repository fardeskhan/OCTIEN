import Link from "next/link";
import { Suspense } from "react";
import { Plus, FileText } from "lucide-react";
import { getQuotations } from "@/app/actions/quotation";
import { formatCurrency } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EnterpriseStatusBadge, EnterpriseEmptyState } from "@/components/enterprise";
import { QuotationRowActions } from "./quotation-row-actions";

async function QuotationsList() {
  const data = await getQuotations();

  if (data.length === 0) {
    return (
      <EnterpriseEmptyState
        icon={<FileText className="h-5 w-5" />}
        title="No quotations yet"
        description="Draft your first quotation to start the sales pipeline."
        action={
          <Link href="/sales/quotations/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="h-4 w-4" /> New Quotation
          </Link>
        }
      />
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm text-left text-muted-foreground">
        <thead className="text-xs text-secondary-foreground uppercase bg-secondary/50">
          <tr>
            <th className="px-6 py-4 font-medium">Quote ID</th>
            <th className="px-6 py-4 font-medium">Customer</th>
            <th className="px-6 py-4 font-medium">Created</th>
            <th className="px-6 py-4 font-medium text-right">Status</th>
            <th className="px-6 py-4 font-medium text-right">Total Amount</th>
            <th className="px-6 py-4 font-medium text-right sr-only">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row) => (
            <tr key={row.id} className="bg-background hover:bg-muted/50 transition-colors">
              <td className="px-6 py-4 font-medium text-foreground">{row.code}</td>
              <td className="px-6 py-4">
                <Link href={`/sales/customers/${row.customerId}`} className="font-medium text-blue-600 hover:underline">{row.customer.name}</Link>
              </td>
              <td className="px-6 py-4">{row.createdAt.toLocaleDateString()}</td>
              <td className="px-6 py-4">
                <div className="flex justify-end">
                  <EnterpriseStatusBadge status={row.status} />
                </div>
              </td>
              <td className="px-6 py-4 text-right font-medium text-foreground">{formatCurrency(row.totalAmount)}</td>
              <td className="px-2 py-4 text-right">
                <QuotationRowActions id={row.id} code={row.code} status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SalesQuotationsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Sales / Quotations</h2>
        <Link href="/sales/quotations/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4" /> New Quotation
        </Link>
      </div>
      <div className="flex gap-4 border-b pb-4 mb-4 text-sm font-medium">
        <Link href="/sales/dashboard" className="text-muted-foreground hover:text-foreground pb-2">Overview</Link>
        <Link href="/sales/customers" className="text-muted-foreground hover:text-foreground pb-2">Customers</Link>
        <Link href="/sales/quotations" className="text-primary border-b-2 border-primary pb-2 -mb-[18px]">Quotations</Link>
        <Link href="/sales/orders" className="text-muted-foreground hover:text-foreground pb-2">Orders</Link>
        <Link href="/sales/returns" className="text-muted-foreground hover:text-foreground pb-2">Returns</Link>
      </div>
      <Suspense fallback={<div className="h-64 w-full animate-pulse bg-muted rounded-lg border"></div>}>
        <QuotationsList />
      </Suspense>
    </div>
  );
}
