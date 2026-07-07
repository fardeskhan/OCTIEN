const fs = require('fs');

let content = fs.readFileSync('apps/frontend/src/app/actions/order.ts', 'utf8');
content = content.replace(
  'if (status === "APPROVED") {',
  `if (status === "APPROVED") {
    // Insert into Outbox
    await db.outboxEventRecord.create({
      data: {
        eventId: \\\`EVT-\\\${Date.now()}-\\\${Math.floor(Math.random() * 1000)}\\\`,
        eventType: "PurchaseOrderApproved",
        aggregateId: id,
        aggregateVersion: 1,
        businessId: currentBusinessId,
        tenantId: session.tenantId || "SYSTEM",
        occurredAt: new Date(),
        payload: { poId: id, status: "APPROVED" },
        status: "PENDING"
      }
    });
`
);
fs.writeFileSync('apps/frontend/src/app/actions/order.ts', content);

let contentReceipt = fs.readFileSync('apps/frontend/src/app/actions/receipt.ts', 'utf8');
contentReceipt = contentReceipt.replace(
  '// Outbox Event simulation: GoodsReceiptRequested',
  `// Emit outbox event
  await db.outboxEventRecord.create({
    data: {
      eventId: \\\`EVT-\\\${Date.now()}-\\\${Math.floor(Math.random() * 1000)}\\\`,
      eventType: "GoodsReceiptRequested",
      aggregateId: gr.id,
      aggregateVersion: 1,
      businessId: currentBusinessId,
      tenantId: session.tenantId || "SYSTEM",
      occurredAt: new Date(),
      payload: { grId: gr.id, poId },
      status: "PENDING"
    }
  });`
);
fs.writeFileSync('apps/frontend/src/app/actions/receipt.ts', contentReceipt);

console.log("Updated order.ts and receipt.ts with Outbox events");
