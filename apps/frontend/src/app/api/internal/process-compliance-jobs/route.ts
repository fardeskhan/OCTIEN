import { NextResponse } from "next/server";
import { ComplianceJobProcessor } from "@/lib/compliance/compliance-job-processor";
import { isAuthorizedCronRequest } from "@/lib/compliance/cron-auth";

// SYSTEM / CRON-ONLY endpoint. ComplianceJobProcessor.processPendingJobs() drains the GLOBAL
// (cross-tenant) compliance-job queue, so this must never be reachable by an ordinary tenant user.
// It is excluded from the session middleware and gated solely by a shared secret here: Vercel Cron
// sends `Authorization: Bearer <CRON_SECRET>` automatically when CRON_SECRET is configured on the
// deployment. Fails CLOSED — until CRON_SECRET is set the endpoint is inert (503).
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Not configured: deny everything rather than run unauthenticated.
    return NextResponse.json({ success: false, error: "Endpoint not configured" }, { status: 503 });
  }
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processedCount = await ComplianceJobProcessor.processPendingJobs();

    return NextResponse.json({
      success: true,
      processedCount
    });
  } catch (error: any) {
    console.error("Error processing compliance jobs:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
