import { db } from "../src/lib/db";
import * as fs from "fs/promises";
import * as path from "path";

const DB_PATH = path.join(process.cwd(), "..", "..", "packages", "database", "prisma", "dev.db");
const ATTACHMENTS_PATH = path.join(process.cwd(), "tmp", "attachments");

const BACKUP_DB_PATH = path.join(process.cwd(), "tmp", "dev.db.bak");
const BACKUP_ATTACHMENTS_PATH = path.join(process.cwd(), "tmp", "attachments.bak");

async function getCounts() {
  const invoiceCount = await db.customerInvoice.count();
  const inventoryCount = await db.inventoryVariantProjection.count();
  const journalCount = await db.journalEntry.count();
  const auditCount = await db.auditEvent.count();
  const documentCount = await db.documentAttachment.count();
  const complianceCount = await db.complianceJob.count();

  return { invoiceCount, inventoryCount, journalCount, auditCount, documentCount, complianceCount };
}

async function copyDir(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    entry.isDirectory() ?
      await copyDir(srcPath, destPath) :
      await fs.copyFile(srcPath, destPath);
  }
}

async function removeDir(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}

async function verifyFilesRestored() {
  const docs = await db.documentAttachment.findMany({ where: { status: "ACTIVE" } });
  let missing = 0;
  for (const doc of docs) {
    const filePath = path.join(ATTACHMENTS_PATH, doc.storageUrl);
    try {
      await fs.access(filePath);
    } catch {
      missing++;
    }
  }
  return missing;
}

async function main() {
  console.log("=== STARTING RC7.0B RELIABILITY & RECOVERY DRILL ===");

  try {
    // 1. Gather initial state
    console.log("[Phase 1] Gathering Pre-Backup state...");
    const preCounts = await getCounts();
    console.log("Pre-Backup Counts:", preCounts);

    // 2. Perform Backup
    console.log("\n[Phase 2] Executing Backup...");
    await fs.copyFile(DB_PATH, BACKUP_DB_PATH);
    
    try {
        await fs.access(ATTACHMENTS_PATH);
        await copyDir(ATTACHMENTS_PATH, BACKUP_ATTACHMENTS_PATH);
    } catch {
        console.log("No attachments directory found, skipping doc backup.");
    }
    
    console.log("✅ Backup created successfully.");

    // Disconnect Prisma so we can safely delete the DB
    await db.$disconnect();

    // 3. Destroy Data (Simulate Disaster)
    console.log("\n[Phase 3] Simulating Disaster (Destroying Data)...");
    await fs.rm(DB_PATH, { force: true });
    
    try {
        await fs.access(ATTACHMENTS_PATH);
        await removeDir(ATTACHMENTS_PATH);
    } catch {}
    
    console.log("🔥 Data destroyed.");

    // 4. Restore Data
    console.log("\n[Phase 4] Restoring Data...");
    await fs.copyFile(BACKUP_DB_PATH, DB_PATH);
    
    try {
        await fs.access(BACKUP_ATTACHMENTS_PATH);
        await copyDir(BACKUP_ATTACHMENTS_PATH, ATTACHMENTS_PATH);
    } catch {}
    
    console.log("✅ Data restored successfully.");

    // 5. Verify Restoration
    console.log("\n[Phase 5] Verifying Post-Backup state...");
    const postCounts = await getCounts();
    console.log("Post-Backup Counts:", postCounts);

    const matches = JSON.stringify(preCounts) === JSON.stringify(postCounts);
    if (!matches) {
      throw new Error("Data mismatch! Recovery failed.");
    }
    console.log("✅ Database counts match perfectly.");

    // 6. Verify Documents
    const missingDocs = await verifyFilesRestored();
    if (missingDocs > 0) {
      throw new Error(`Document restore failed! ${missingDocs} documents missing from storage.`);
    }
    console.log("✅ All physical document attachments verified and present.");

    console.log("\n=== RC7.0B RELIABILITY DRILL PASSED ===");

  } catch (e: any) {
    console.error("\n❌ DRILL FAILED:", e.message);
    process.exit(1);
  } finally {
    // Cleanup backups
    await fs.rm(BACKUP_DB_PATH, { force: true }).catch(() => {});
    await removeDir(BACKUP_ATTACHMENTS_PATH).catch(() => {});
  }
}

main();
