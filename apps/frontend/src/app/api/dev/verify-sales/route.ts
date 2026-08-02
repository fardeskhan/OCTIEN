import { NextResponse } from "next/server";
import { runSalesRuntimeVerification } from "@/lib/verification/sales-runtime";

/**
 * Dev-only runner for the Sales workflow runtime verification. Disabled in production.
 * GET /api/dev/verify-sales  →  JSON checklist with pass/fail per step.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const businessId = new URL(request.url).searchParams.get("businessId") ?? undefined;
  const report = await runSalesRuntimeVerification({ businessId });
  return NextResponse.json(report);
}
