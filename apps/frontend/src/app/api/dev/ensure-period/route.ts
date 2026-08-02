import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Dev-only: ensure an OPEN AccountingPeriod covering "today" for every business, so the posting
 * engine (which defaults params.date to new Date()) can post. Idempotent — upserts by (businessId,
 * name). Mirrors scripts/ensure-open-periods.mjs.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "nope" }, { status: 404 });

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const name = `${now.toLocaleDateString("en-US", { month: "short" })} ${now.getFullYear()}`;

  const businesses = await db.business.findMany({ select: { id: true, name: true } });
  const ensured: string[] = [];
  for (const b of businesses) {
    const existing = await db.accountingPeriod.findUnique({ where: { businessId_name: { businessId: b.id, name } } });
    if (existing) {
      if (existing.status !== "OPEN") await db.accountingPeriod.update({ where: { id: existing.id }, data: { status: "OPEN", closedAt: null, lockedAt: null } });
    } else {
      await db.accountingPeriod.create({ data: { businessId: b.id, name, startDate: start, endDate: end, status: "OPEN" } });
    }
    ensured.push(`${b.name}: ${name}`);
  }
  return NextResponse.json({ ensured, period: { name, start, end }, count: ensured.length });
}
