const fs = require('fs');

function addProcessor(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('processOutboxBatch')) {
    content = content.replace(/import \{ revalidatePath \}/, 'import { processOutboxBatch } from "@/lib/outbox";\nimport { revalidatePath }');
    content = content.replace(/redirect\(`([^`]+)`\);/g, 'await processOutboxBatch();\n  redirect(`$1`);');
    content = content.replace(/return \{ success: true \};/g, 'await processOutboxBatch();\n  return { success: true };');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

addProcessor('apps/frontend/src/app/actions/sales-order.ts');
addProcessor('apps/frontend/src/app/actions/sales-return.ts');
addProcessor('apps/frontend/src/app/actions/order.ts');
addProcessor('apps/frontend/src/app/actions/receipt.ts');
addProcessor('apps/frontend/src/app/actions/inventory.ts');
