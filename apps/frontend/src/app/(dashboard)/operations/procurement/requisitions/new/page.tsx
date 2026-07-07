// @ts-nocheck
import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { NewRequisitionForm } from "@/components/procurement/new-requisition-form";

export default async function NewRequisitionPage() {
  const { currentBusinessId } = await requireBusinessContext();

  const variants = await db.productVariant.findMany({
    where: { businessId: currentBusinessId, deletedAt: null },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  return <NewRequisitionForm variants={variants} />;
}
