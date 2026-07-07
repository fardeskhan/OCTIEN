const fs = require('fs');
const path = require('path');

const dir = 'apps/frontend/src/app/actions';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts')).map(f => path.join(dir, f));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.includes('where: { businessId }') || content.includes('where: { businessId,')) {
    if (!content.includes('withActiveRecords')) {
      // Add import
      content = content.replace(/import \{ db \} from "@\/lib\/db";/, 'import { db } from "@/lib/db";\nimport { withActiveRecords } from "@/lib/db-helpers";');
      changed = true;
    }
    
    // Replace where clauses that just have businessId
    content = content.replace(/where:\s*\{\s*businessId\s*\}/g, 'where: withActiveRecords({ businessId })');
    content = content.replace(/where:\s*\{\s*id,\s*businessId\s*\}/g, 'where: withActiveRecords({ id, businessId })');
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
}
console.log('Done');
