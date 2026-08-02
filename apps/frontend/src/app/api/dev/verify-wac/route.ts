import { NextResponse } from "next/server";
import { runWacVerification } from "@/lib/verification/wac-runtime";

/** Dev-only runner for the deterministic WAC verification matrix. Disabled in production. */
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  return NextResponse.json(runWacVerification());
}
