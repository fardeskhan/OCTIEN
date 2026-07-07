// @ts-nocheck
import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { NewReceiptForm } from "@/components/procurement/new-receipt-form";
import { redirect } from "next/navigation";

export default async function NewReceiptPage({ searchParams }: { searchParams: { poId: string } }) {
  const { currentBusinessId } = await requireBusinessContext();

  if (!searchParams.poId) redirect("/dashboard/operations/procurement/orders");

  const po = await db.purchaseOrder.findUnique({
    where: { id: searchParams.poId, businessId: currentBusinessId },
    include: {
      lines: { include: { variant: { include: { product: true } } } }
    }
  });

  if (!po) redirect("/dashboard/operations/procurement/orders");

  const warehouses = await db.warehouse.findMany({
    where: { businessId: currentBusinessId, deletedAt: null },
    orderBy: { name: "asc" }
  });

  return <NewReceiptForm po={po} warehouses={warehouses} />;
}
