
import { PrismaClient } from "@prisma/client";
import { DocumentService } from "../src/lib/documents/document-service";
import * as crypto from "crypto";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.7 DOCUMENTS VALIDATION ===");
  const business = await db.business.findFirst();
  if (!business) throw new Error("Business not found");

  const tenantId = business.id;
  const userId = "u-system";
  
  const dummyPdf = Buffer.from("%PDF-1.4...", "utf-8");
  const dummyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
  
  // Test 1: Upload Invoice Attachment & Retrieve
  const invoice = await db.customerInvoice.findFirst({ where: { businessId: business.id }});
  if (!invoice) throw new Error("No invoice found");
  
  await DocumentService.uploadDocument(
    business.id, tenantId, userId, 
    "CUSTOMER_INVOICE", invoice.id, 
    dummyPdf, "invoice_scan.pdf", "application/pdf"
  );
  
  let attachments = await DocumentService.getAttachments(business.id, "CUSTOMER_INVOICE", invoice.id);
  if (attachments.length > 0) {
    console.log("? Test 1 Passed: Invoice attachment uploaded and retrieved.");
  } else {
    throw new Error("Test 1 Failed");
  }

  // Test 2: Upload Bill Attachment & Retrieve
  const bill = await db.supplierBill.findFirst({ where: { businessId: business.id }});
  if (!bill) throw new Error("No bill found");

  await DocumentService.uploadDocument(
    business.id, tenantId, userId, 
    "SUPPLIER_BILL", bill.id, 
    dummyPng, "receipt.png", "image/png"
  );
  
  let count = await DocumentService.getAttachmentCount(business.id, "SUPPLIER_BILL", bill.id);
  if (count > 0) {
    console.log(`? Test 2 Passed: Bill attachment uploaded. Count is ${count}.`);
  } else {
    throw new Error("Test 2 Failed");
  }

  // Test 3: Delete Attempt -> Must fail
  try {
    await DocumentService.deleteAttachment("dummy");
    throw new Error("Test 3 Failed: Deletion was allowed!");
  } catch (err: any) {
    if (err.message.includes("Immutable storage violation")) {
      console.log("? Test 3 Passed: Immutable storage violation correctly thrown on delete.");
    } else {
      throw err;
    }
  }

  // Test 4: Duplicate Upload -> Checksum Detection
  try {
    await DocumentService.uploadDocument(
      business.id, tenantId, userId, 
      "CUSTOMER_INVOICE", invoice.id, 
      dummyPdf, "invoice_scan_copy.pdf", "application/pdf" // same bytes
    );
    throw new Error("Test 4 Failed: Duplicate allowed.");
  } catch (err: any) {
    if (err.message.includes("Duplicate document detected")) {
      console.log("? Test 4 Passed: Duplicate upload blocked by Checksum.");
    } else {
      throw err;
    }
  }

  // Test 5: Invalid MIME Type -> Must fail
  try {
    await DocumentService.uploadDocument(
      business.id, tenantId, userId, 
      "CUSTOMER_INVOICE", invoice.id, 
      dummyPdf, "virus.exe", "application/x-msdownload"
    );
    throw new Error("Test 5 Failed: Invalid MIME type allowed.");
  } catch (err: any) {
    if (err.message.includes("Invalid MIME Type")) {
      console.log("? Test 5 Passed: Invalid MIME type blocked.");
    } else {
      throw err;
    }
  }

  // Test 6: File Size > Limit -> Must fail
  try {
    const hugeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    await DocumentService.uploadDocument(
      business.id, tenantId, userId, 
      "CUSTOMER_INVOICE", invoice.id, 
      hugeBuffer, "huge.png", "image/png"
    );
    throw new Error("Test 6 Failed: Large file allowed.");
  } catch (err: any) {
    if (err.message.includes("exceeds the limit")) {
      console.log("? Test 6 Passed: Category file size limit enforced (11MB > 10MB for PNG).");
    } else {
      throw err;
    }
  }

  // Test 7: Supersede logic
  const supersedePdf = Buffer.from("%PDF-1.4...v2", "utf-8"); // different bytes
  await DocumentService.uploadDocument(
    business.id, tenantId, userId, 
    "CUSTOMER_INVOICE", invoice.id, 
    supersedePdf, "invoice_scan.pdf", "application/pdf"
  );
  
  const allHistory = await db.documentAttachment.findMany({
    where: { businessId: business.id, sourceType: "CUSTOMER_INVOICE", sourceId: invoice.id, fileName: "invoice_scan.pdf" }
  });

  const active = allHistory.filter(d => d.status === "ACTIVE");
  const superseded = allHistory.filter(d => d.status === "SUPERSEDED");

  if (active.length === 1 && superseded.length === 1 && active[0].version === 2) {
    console.log("? Test 7 Passed: Supersede logic correctly maintained active/superseded versions.");
  } else {
    throw new Error(`Test 7 Failed: Expected 1 active and 1 superseded. Got ${active.length} active, ${superseded.length} superseded.`);
  }

  console.log("=== RC5.7 VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());

