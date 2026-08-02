import { db } from "@/lib/db";
import { getHandler } from "./registry";
import "./handlers"; // Ensure handlers are registered

/**
 * Drain the outbox to completion. `processOutboxBatch` advances a single hop; some flows chain
 * events (e.g. SalesOrderConfirmed → InventoryReservationRequested → reservation), so a caller
 * that needs the whole chain resolved synchronously loops until nothing PENDING remains.
 */
export async function drainOutbox(maxPasses = 5) {
  for (let pass = 0; pass < maxPasses; pass++) {
    const pending = await db.outboxEventRecord.count({ where: { status: "PENDING" } });
    if (pending === 0) return;
    await processOutboxBatch();
  }
}

export async function processOutboxBatch(limit = 50) {
  // Simple synchronous processor for RC2

  const pendingEvents = await db.outboxEventRecord.findMany({
    where: { status: "PENDING" },
    take: limit,
    orderBy: { occurredAt: "asc" }
  });

  if (pendingEvents.length === 0) return;

  for (const event of pendingEvents) {
    try {
      // Mark as PROCESSING
      await db.outboxEventRecord.update({
        where: { eventId: event.eventId },
        data: { status: "PROCESSING", lastAttemptAt: new Date() }
      });

      const handler = getHandler(event.eventType);
      
      if (handler) {
        await handler(event);
      } else {
        console.warn(`No handler found for event type: ${event.eventType}`);
      }

      // Mark as COMPLETED
      await db.outboxEventRecord.update({
        where: { eventId: event.eventId },
        data: { status: "COMPLETED", processedAt: new Date() }
      });
    } catch (error) {
      console.error(`Failed to process event ${event.eventId}`, error);

      // Mark as FAILED
      await db.outboxEventRecord.update({
        where: { eventId: event.eventId },
        data: {
          status: "FAILED",
          failureReason: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }
  }
}
