export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getShipmentById } from "@/app/actions/fulfillment";
import { branding } from "@/lib/branding";
import { buttonVariants } from "@/components/ui/button";
import { PrintButton } from "./print-button";

function fmtDate(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export default async function DeliveryNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");

  const shipment = await getShipmentById(id);
  if (!shipment) notFound();

  const business = await db.business.findUnique({ where: { id: businessId }, select: { name: true } });
  const dnCode = shipment.deliveryNote?.code ?? `DN-${shipment.code.replace(/^SHP-/, "")}`;
  const addr = shipment.salesOrder.customer;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      {/* Toolbar — hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/sales/deliveries/${id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="h-4 w-4" /> Shipment
        </Link>
        <PrintButton />
      </div>

      {/* Printable sheet */}
      <div className="rounded-lg border border-border bg-white p-8 text-slate-900 shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
          <div>
            <div className="text-xl font-bold">{business?.name ?? branding.productName}</div>
            <div className="text-xs text-slate-500">Warehouse: {shipment.warehouse.name}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tracking-wide">DELIVERY NOTE</div>
            <div className="mt-1 text-sm">{dnCode}</div>
            <div className="text-xs text-slate-500">Shipment {shipment.code}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Deliver To</div>
            <div className="mt-1 font-semibold">{addr.name}</div>
            <div className="text-slate-600">Customer code: {addr.code}</div>
          </div>
          <div className="text-right">
            <div className="flex justify-end gap-6"><span className="text-slate-400">Sales Order</span><span className="font-medium">{shipment.salesOrder.code}</span></div>
            <div className="flex justify-end gap-6"><span className="text-slate-400">Status</span><span className="font-medium">{shipment.status}</span></div>
            <div className="flex justify-end gap-6"><span className="text-slate-400">Date</span><span className="font-medium">{fmtDate(shipment.receivedAt ?? shipment.updatedAt)}</span></div>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-300 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="py-2 font-semibold">#</th>
              <th className="py-2 font-semibold">Product</th>
              <th className="py-2 text-right font-semibold">Ordered</th>
              <th className="py-2 text-right font-semibold">Shipped</th>
            </tr>
          </thead>
          <tbody>
            {shipment.lines.map((l, i) => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="py-2">{i + 1}</td>
                <td className="py-2">{l.variant.product?.name ?? l.variant.name}</td>
                <td className="py-2 text-right tabular-nums">{l.requestedQty}</td>
                <td className="py-2 text-right font-medium tabular-nums">{l.shippedQty}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="mb-10 text-slate-400">Delivered by</div>
            <div className="w-48 border-t border-slate-400 pt-1 text-slate-600">Signature &amp; date</div>
          </div>
          <div className="text-right">
            <div className="mb-10 text-slate-400">Received by</div>
            <div className="ml-auto w-48 border-t border-slate-400 pt-1 text-slate-600">Signature &amp; date</div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-3 text-center text-[10px] uppercase tracking-[0.15em] text-slate-400">
          Generated with {branding.productName} · {branding.company.poweredBy}
        </div>
      </div>
    </div>
  );
}
