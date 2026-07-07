import { ComplianceJobProcessor } from "../src/lib/compliance/compliance-job-processor";

async function main() {
  console.log("=== STARTING COMPLIANCE JOB PROCESSOR (CLI) ===");
  try {
    const processedCount = await ComplianceJobProcessor.processPendingJobs();
    console.log(`=== PROCESSOR COMPLETE (Processed: ${processedCount}) ===`);
    process.exit(0);
  } catch (err) {
    console.error("Processor failed:", err);
    process.exit(1);
  }
}

main();
