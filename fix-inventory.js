const fs = require('fs');

let content = fs.readFileSync('apps/frontend/src/app/actions/inventory.ts', 'utf8');

// Replace the entire processGoodsReceiptRequest function
const newFunc = `export async function processGoodsReceiptRequest(grId: string, acceptedLines: { id: string, acceptedQty: number, rejectedQty: number }[]) {
  const { currentBusinessId, tenantId, session } = await requireBusinessContext();
  await requirePermission("inventory.update");

  await db.$transaction(async (tx: any) => {
    const gr = await tx.goodsReceiptRequest.findUnique({
      where: { id: grId, businessId: currentBusinessId },
      include: { lines: true, purchaseOrder: true }
    });

    if (!gr || gr.status !== "REQUESTED") throw new Error("Invalid Goods Receipt Request");

    const timestamp = Date.now();
    const correlationId = \\\`GR-\\\${timestamp}\\\`;

    let totalAccepted = 0;

    for (const inputLine of acceptedLines) {
      const line = gr.lines.find((l: any) => l.id === inputLine.id);
      if (!line) continue;

      const varianceQty = line.requestedQty - (inputLine.acceptedQty + inputLine.rejectedQty);

      await tx.goodsReceiptLine.update({
        where: { id: line.id },
        data: {
          acceptedQty: inputLine.acceptedQty,
          rejectedQty: inputLine.rejectedQty,
          varianceQty
        }
      });

      if (inputLine.acceptedQty > 0) {
        const inventory = await ensureInventoryRecord(tx, currentBusinessId, tenantId, line.variantId, gr.warehouseId);

        await tx.stockMovementRecord.create({
          data: {
            id: \\\`MOV-IN-\\\${timestamp}-\\\${line.id}\\\`,
            businessId: currentBusinessId,
            tenantId,
            inventoryId: inventory.id,
            variantId: line.variantId,
            warehouseId: gr.warehouseId,
            type: "RECEIVED",
            quantityValue: inputLine.acceptedQty,
            quantityUnit: "pcs",
            actorId: session.userId,
            correlationId,
          }
        });

        await updateVariantProjection(tx, currentBusinessId, tenantId, line.variantId, gr.warehouseId);
      }

      totalAccepted += inputLine.acceptedQty;
    }

    await tx.goodsReceiptRequest.update({
      where: { id: grId },
      data: {
        status: "COMPLETED",
        receivedAt: new Date(),
        updatedBy: session.userId,
      }
    });

    if (totalAccepted > 0) {
      await tx.outboxEventRecord.create({
        data: {
          eventId: \\\`EVT-\\\${Date.now()}-\\\${Math.floor(Math.random() * 1000)}\\\`,
          eventType: "InventoryReceived",
          aggregateId: gr.id,
          aggregateVersion: 1,
          businessId: currentBusinessId,
          tenantId: tenantId,
          occurredAt: new Date(),
          payload: { poId: gr.poId, acceptedLines },
          status: "PENDING"
        }
      });
    }
  });

  revalidatePath("/dashboard/procurement/receipts");
  revalidatePath("/dashboard/inventory");
  await processOutboxBatch();
  return { success: true };
}
`;

content = content.replace(/export async function processGoodsReceiptRequest[\s\S]*?(?=\n$|$)/m, newFunc);
fs.writeFileSync('apps/frontend/src/app/actions/inventory.ts', content);
console.log("Fixed inventory.ts");
