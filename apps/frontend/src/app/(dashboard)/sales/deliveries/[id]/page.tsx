export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, FileText, History } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getShipmentById } from "@/app/actions/fulfillment";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EnterprisePage,
  EnterprisePageHeader,
  EnterpriseSection,
  EnterpriseStatusBadge,
  EnterpriseEmptyState,
} from "@/components/enterprise";
import { ShipmentActions } from "./shipment-actions";

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground/40" />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export default async function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");

  const shipment = await getShipmentById(id);
  if (!shipment) notFound();

  const [reservation, movement, dispatchInvoice, auditEntries] = await Promise.all([
    db.reservationRecord.findFirst({ where: { businessId, referenceId: shipment.soId } }),
    db.stockMovementRecord.findFirst({ where: { businessId, correlationId: `SHP-${id}` } }),
    db.customerInvoice.findFirst({ where: { businessId, sourceType: "SHIPMENT", sourceId: id, deletedAt: null } }),
    db.auditLog.findMany({ where: { businessId, resource: "shipment", resourceId: id }, orderBy: { occurredAt: "desc" }, take: 30 }),
  ]);
  const journal = await db.journalEntry.findFirst({
    where: { businessId, OR: [{ sourceId: id }, ...(dispatchInvoice ? [{ sourceId: dispatchInvoice.id }] : [])] },
  });

  // Reserved qty per shipment line comes from the linked sales-order line.
  const reservedByLine = new Map(shipment.salesOrder.lines.map((l) => [l.id, l.reservedQty]));

  return (
    <EnterprisePage>
      <EnterprisePageHeader
        title={
          <span className="flex items-center gap-3">
            {shipment.code}
            <EnterpriseStatusBadge status={shipment.status} />
          </span>
        }
        description={`${shipment.salesOrder.customer.name} · SO ${shipment.salesOrder.code} · ${shipment.warehouse.name}`}
        actions={
          <div className="flex items-center gap-2">
            {(shipment.status === "DISPATCHED" || shipment.status === "DELIVERED") && (
              <Link href={`/sales/deliveries/${id}/delivery-note`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <FileText className="h-4 w-4" /> Delivery Note
              </Link>
            )}
            <Link href="/sales/deliveries" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="h-4 w-4" /> Deliveries
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Lifecycle</CardTitle>
            <ShipmentActions
              id={shipment.id}
              code={shipment.code}
              status={shipment.status}
              lines={shipment.lines.map((l) => ({ id: l.id, requestedQty: l.requestedQty }))}
            />
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Draft → Picking → Packing → Dispatched (deducts stock, posts invoice &amp; accounting) → Delivered.
          </CardContent>
        </Card>

        {/* Downstream process visibility — mirrors what runtime verification checks. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Downstream status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Check ok={!!reservation} label="Inventory reserved" />
            <Check ok={!!movement} label="Stock deducted" />
            <Check ok={!!dispatchInvoice} label="Invoice created" />
            <Check ok={!!journal} label="Journal posted" />
            <Check ok={auditEntries.length > 0} label="Audit logged" />
          </CardContent>
        </Card>
      </div>

      <EnterpriseSection title="Shipment Lines" description="Requested → Reserved → Picked → Packed → Shipped">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">Requested</th>
                <th className="px-4 py-3 text-right font-medium">Reserved</th>
                <th className="px-4 py-3 text-right font-medium">Picked</th>
                <th className="px-4 py-3 text-right font-medium">Packed</th>
                <th className="px-4 py-3 text-right font-medium">Shipped</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shipment.lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{l.variant.product?.name ?? l.variant.name}</div>
                    <div className="text-xs text-muted-foreground">{l.variant.name}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{l.requestedQty}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{reservedByLine.get(l.soLineId) ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{l.pickedQty}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{l.packedQty}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{l.shippedQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EnterpriseSection>

      <EnterpriseSection title="History" description="Audit trail for this shipment">
        {auditEntries.length === 0 ? (
          <EnterpriseEmptyState icon={<History className="h-5 w-5" />} title="No activity yet" description="Lifecycle actions will appear here." />
        ) : (
          <ol className="relative ml-3 space-y-4 border-l-2 border-muted pl-5">
            {auditEntries.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
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
