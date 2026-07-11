import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { getActiveBusinessId } from "@/lib/server-auth";
import { formatCurrency, formatNumber } from "@/lib/utils";

async function getBusinessId() {
  return getActiveBusinessId();
}

async function SalesDashboardData() {
  const businessId = await getBusinessId();
  
  // Real-time queries for V1
  const openOrdersCount = await db.salesOrder.count({
    where: { businessId, status: { in: ["APPROVED", "CONFIRMED", "PARTIALLY_FULFILLED"] } }
  });

  const totalSalesAgg = await db.salesOrder.aggregate({
    where: { businessId, status: { in: ["FULFILLED"] } },
    _sum: { totalAmount: true }
  });

  const pendingReturns = await db.salesReturn.count({
    where: { businessId, status: "REQUESTED" }
  });

  const activeCustomers = await db.customer.count({
    where: { businessId, status: "ACTIVE" }
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">Total Sales (Fulfilled)</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{formatCurrency(totalSalesAgg._sum.totalAmount || 0)}</div>
        </div>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">Open Orders</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{formatNumber(openOrdersCount)}</div>
        </div>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">Active Customers</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{formatNumber(activeCustomers)}</div>
        </div>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">Pending Returns</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{formatNumber(pendingReturns)}</div>
        </div>
      </div>
    </div>
  );
}

export default function SalesDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Sales Dashboard</h2>
      </div>
      <div className="flex gap-4 border-b pb-4 mb-4 text-sm font-medium">
        <Link href="/sales/dashboard" className="text-primary border-b-2 border-primary pb-2 -mb-[18px]">Overview</Link>
        <Link href="/sales/customers" className="text-muted-foreground hover:text-foreground pb-2">Customers</Link>
        <Link href="/sales/quotations" className="text-muted-foreground hover:text-foreground pb-2">Quotations</Link>
        <Link href="/sales/orders" className="text-muted-foreground hover:text-foreground pb-2">Orders</Link>
        <Link href="/sales/returns" className="text-muted-foreground hover:text-foreground pb-2">Returns</Link>
      </div>
      <Suspense fallback={<div className="h-40 w-full animate-pulse bg-muted rounded-lg border"></div>}>
        <SalesDashboardData />
      </Suspense>
    </div>
  );
}
