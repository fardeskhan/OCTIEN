export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getSalesOrderById } from "@/app/actions/sales-order";
import { createShipment } from "@/app/actions/fulfillment";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/currency";
import {
  EnterprisePage,
  EnterprisePageHeader,
  EnterpriseSection,
  EnterpriseStatusBadge,
  EnterpriseEmptyState,
} from "@/components/enterprise";
import { SalesOrderActions } from "./sales-order-actions";

export default async function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");

  const order = await getSalesOrderById(id);
  if (!order) notFound();

  const auditEntries = await db.auditLog.findMany({
    where: { businessId, resource: "sales_order", resourceId: order.id },
    orderBy: { occurredAt: "desc" },
    take: 30,
  });

  const totalReserved = order.lines.reduce((s, l) => s + l.reservedQty, 0);

  const [defaultWarehouse, shipments] = await Promise.all([
    db.warehouse.findFirst({ where: { businessId, isDefault: true }, select: { id: true } }),
    db.shipment.findMany({ where: { businessId, soId: order.id, deletedAt: null }, select: { id: true, code: true, status: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const canDeliver = (order.status === "CONFIRMED" || order.status === "PARTIALLY_FULFILLED") && !!defaultWarehouse;

  return (
    <EnterprisePage>
      <EnterprisePageHeader
        title={
          <span className="flex items-center gap-3">
            {order.code}
            <EnterpriseStatusBadge status={order.status} />
          </span>
        }
        description={`${order.customer.name} · created ${order.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`}
        actions={
          <Link href="/sales/orders" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" /> Orders
          </Link>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Lifecycle</CardTitle>
          <SalesOrderActions id={order.id} code={order.code} status={order.status} />
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Draft → Approved → Confirmed (reserves stock) → Fulfilled. Cancel releases any reserved stock.</p>
          <div className="flex flex-wrap items-center gap-3">
            {canDeliver && defaultWarehouse && (
              <form action={createShipment}>
                <input type="hidden" name="soId" value={order.id} />
                <input type="hidden" name="warehouseId" value={defaultWarehouse.id} />
                <Button type="submit" size="sm" variant="outline">Create delivery</Button>
              </form>
            )}
            {shipments.map((s) => (
              <Link key={s.id} href={`/sales/deliveries/${s.id}`} className="text-sm font-medium text-primary hover:underline">
                {s.code} ({s.status})
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <EnterpriseSection title="Line Items" description={totalReserved > 0 ? `${totalReserved} unit(s) reserved` : undefined}>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Reserved</th>
                <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{l.variant.product?.name ?? l.variant.name}</div>
                    <div className="text-xs text-muted-foreground">{l.variant.name}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{l.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {l.reservedQty > 0 ? l.reservedQty : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatINR(l.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatINR(l.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <td className="px-4 py-3" colSpan={4}>Order Total</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatINR(order.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </EnterpriseSection>

      <EnterpriseSection title="History" description="Audit trail for this order">
        {auditEntries.length === 0 ? (
          <EnterpriseEmptyState icon={<History className="h-5 w-5" />} title="No activity yet" description="Lifecycle actions on this order will appear here." />
        ) : (
          <ol className="relative ml-3 space-y-4 border-l-2 border-muted pl-5">
            {auditEntries.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium capitalize text-foreground">{e.action}</span>
                  <EnterpriseStatusBadge status={e.action} showIcon={false} />
                  <span className="text-xs text-muted-foreground">
                    {e.occurredAt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </EnterpriseSection>
    </EnterprisePage>
  );
}
