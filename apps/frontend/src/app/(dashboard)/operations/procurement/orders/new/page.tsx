import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { NewOrderForm } from "@/components/procurement/new-order-form";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ prId?: string }> }) {
  const { prId } = await searchParams;
  const { currentBusinessId } = await requireBusinessContext();

  const suppliers = await db.supplier.findMany({
    where: { businessId: currentBusinessId, deletedAt: null, status: { notIn: ["TERMINATED", "SUSPENDED"] } },
    orderBy: { name: "asc" }
  });

  const variants = await db.productVariant.findMany({
    where: { businessId: currentBusinessId, deletedAt: null },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  let initialPR = null;
  if (prId) {
    initialPR = await db.purchaseRequisition.findUnique({
      where: { id: prId, businessId: currentBusinessId },
      include: { lines: true }
    });
  }

  return <NewOrderForm suppliers={suppliers} variants={variants} initialPR={initialPR} />;
}
