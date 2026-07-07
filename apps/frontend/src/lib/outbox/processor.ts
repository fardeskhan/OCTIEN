import { db } from "@/lib/db";
import { getHandler } from "./registry";
import "./handlers"; // Ensure handlers are registered

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
    } catch (error: any) {
      console.error(`Failed to process event ${event.eventId}`, error);
      
      // Mark as FAILED
      await db.outboxEventRecord.update({
        where: { eventId: event.eventId },
        data: { 
          status: "FAILED",
          failureReason: error.message || "Unknown error"
        }
      });
    }
  }
}
