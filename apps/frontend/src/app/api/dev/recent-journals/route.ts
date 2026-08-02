import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Dev-only: return recent journal entries with their balanced lines, so a runtime check can
 * confirm an authenticated invoice/payment actually posted to the general ledger. Prod-disabled.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const sourceType = new URL(request.url).searchParams.get("sourceType") ?? undefined;
  const entries = await db.journalEntry.findMany({
    where: sourceType ? { sourceType: sourceType as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { lines: { include: { account: { select: { accountCode: true, name: true } } } } },
  });
  return NextResponse.json({
    count: entries.length,
    entries: entries.map((e) => ({
      id: e.id,
      description: e.description,
      reference: e.reference,
      sourceType: e.sourceType,
      sourceId: e.sourceId,
      lines: e.lines.map((l) => ({ account: `${l.account.accountCode} ${l.account.name}`, debit: Number(l.debit), credit: Number(l.credit) })),
    })),
  });
}
