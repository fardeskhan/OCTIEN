import Link from "next/link";
import { Suspense } from "react";
import { getSalesReturns } from "@/app/actions/sales-return";

async function ReturnsList() {
  const data = await getSalesReturns();

  if (data.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed text-center">
        <p className="text-sm text-muted-foreground">No sales returns found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm text-left text-muted-foreground">
        <thead className="text-xs text-secondary-foreground uppercase bg-secondary/50">
          <tr>
            <th className="px-6 py-4 font-medium">Return ID</th>
            <th className="px-6 py-4 font-medium">Order ID</th>
            <th className="px-6 py-4 font-medium">Customer</th>
            <th className="px-6 py-4 font-medium">Created</th>
            <th className="px-6 py-4 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row) => (
            <tr key={row.id} className="bg-background hover:bg-muted/50 transition-colors">
              <td className="px-6 py-4 font-medium text-foreground">{row.code}</td>
              <td className="px-6 py-4">
                <Link href={`/sales/orders/${row.soId}`} className="text-blue-600 hover:underline">{row.salesOrder.code}</Link>
              </td>
              <td className="px-6 py-4">
                <Link href={`/sales/customers/${row.customerId}`} className="font-medium text-blue-600 hover:underline">{row.customer.name}</Link>
              </td>
              <td className="px-6 py-4">{row.createdAt.toLocaleDateString()}</td>
              <td className="px-6 py-4 text-right">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : row.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' : 'bg-secondary text-secondary-foreground'}`}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SalesReturnsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Sales / Returns</h2>
      </div>
      <div className="flex gap-4 border-b pb-4 mb-4 text-sm font-medium">
        <Link href="/sales/dashboard" className="text-muted-foreground hover:text-foreground pb-2">Overview</Link>
        <Link href="/sales/customers" className="text-muted-foreground hover:text-foreground pb-2">Customers</Link>
        <Link href="/sales/quotations" className="text-muted-foreground hover:text-foreground pb-2">Quotations</Link>
        <Link href="/sales/orders" className="text-muted-foreground hover:text-foreground pb-2">Orders</Link>
        <Link href="/sales/returns" className="text-primary border-b-2 border-primary pb-2 -mb-[18px]">Returns</Link>
      </div>
      <Suspense fallback={<div className="h-64 w-full animate-pulse bg-muted rounded-lg border"></div>}>
        <ReturnsList />
      </Suspense>
    </div>
  );
}
