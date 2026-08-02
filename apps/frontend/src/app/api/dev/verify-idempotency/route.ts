import { NextResponse } from "next/server";
import { runIdempotencyVerification } from "@/lib/verification/idempotency-runtime";

/** Dev-only runner for the procurement duplicate-protection / idempotency verification. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const businessId = new URL(request.url).searchParams.get("businessId") ?? undefined;
  return NextResponse.json(await runIdempotencyVerification({ businessId }));
}
