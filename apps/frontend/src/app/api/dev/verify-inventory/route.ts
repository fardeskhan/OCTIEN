import { NextResponse } from "next/server";
import { runInventoryRuntimeVerification } from "@/lib/verification/inventory-runtime";

/** Dev-only runner for the Inventory backend runtime verification. Disabled in production. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const businessId = new URL(request.url).searchParams.get("businessId") ?? undefined;
  return NextResponse.json(await runInventoryRuntimeVerification({ businessId }));
}
