import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { NewReceiptForm } from "@/components/procurement/new-receipt-form";
import { redirect } from "next/navigation";

export default async function NewReceiptPage({ searchParams }: { searchParams: Promise<{ poId: string }> }) {
  const { poId } = await searchParams;
  const { currentBusinessId } = await requireBusinessContext();

  if (!poId) redirect("/operations/procurement/orders");

  const po = await db.purchaseOrder.findUnique({
    where: { id: poId, businessId: currentBusinessId },
    include: {
      lines: { include: { variant: { include: { product: true } } } }
    }
  });

  if (!po) redirect("/operations/procurement/orders");

  const warehouses = await db.warehouse.findMany({
    where: { businessId: currentBusinessId, deletedAt: null },
    orderBy: { name: "asc" }
  });

  return <NewReceiptForm po={po} warehouses={warehouses} />;
}
