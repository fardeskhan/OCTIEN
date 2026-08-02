import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Dev-only: return the most recent audit-log entries (optionally filtered by resource) so a
 * runtime verification can confirm that an authenticated mutation actually wrote an audit row.
 * Disabled in production.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") ?? undefined;
  const entries = await db.auditLog.findMany({
    where: resource ? { resource } : undefined,
    orderBy: { occurredAt: "desc" },
    take: 10,
    select: { id: true, action: true, resource: true, resourceId: true, actorId: true, occurredAt: true, metadata: true },
  });
  return NextResponse.json({ count: entries.length, entries });
}
