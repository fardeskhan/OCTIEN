// @ts-nocheck
import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ShoppingCart, Truck, Users, AlertTriangle } from "lucide-react";

export default async function ProcurementDashboardPage() {
  const { currentBusinessId } = await requireBusinessContext();

  const [
    openReqs,
    openPOs,
    overduePOs,
    pendingReceipts,
    supplierCount
  ] = await Promise.all([
    db.purchaseRequisition.count({ where: { businessId: currentBusinessId, status: { in: ["DRAFT", "SUBMITTED"] } } }),
    db.purchaseOrder.count({ where: { businessId: currentBusinessId, status: { in: ["DRAFT", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED"] } } }),
    db.purchaseOrder.count({ where: { businessId: currentBusinessId, status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] }, expectedAt: { lt: new Date() } } }),
    db.goodsReceiptRequest.count({ where: { businessId: currentBusinessId, status: { in: ["REQUESTED", "PROCESSING"] } } }),
    db.supplier.count({ where: { businessId: currentBusinessId, status: { in: ["ACTIVE", "UNDER_REVIEW"] } } })
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Procurement KPIs</h2>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Requisitions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openReqs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open POs</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPOs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue POs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overduePOs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Receipts</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReceipts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
