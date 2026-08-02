import { NextResponse } from "next/server";
import { runProcurementRuntimeVerification } from "@/lib/verification/procurement-runtime";

/** Dev-only runner for the Procurement workflow runtime verification. Disabled in production. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const businessId = new URL(request.url).searchParams.get("businessId") ?? undefined;
  const report = await runProcurementRuntimeVerification({ businessId });
  return NextResponse.json(report);
}
