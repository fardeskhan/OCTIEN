import { NextResponse } from "next/server";
import { ComplianceJobProcessor } from "@/lib/compliance/compliance-job-processor";

// This endpoint could be triggered by a Cron service like Vercel Cron, AWS EventBridge, etc.
// In a real production setup, add an authorization secret check here.
export async function POST(req: Request) {
  try {
    // Optionally check a CRON_SECRET from headers to prevent unauthorized triggers
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
