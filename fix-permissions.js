const fs = require('fs');
const path = require('path');

const dir = 'apps/frontend/src/app/actions';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts')).map(f => path.join(dir, f));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/requirePermission\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g, 'requirePermission("$1.$2")');
  
  // also replace enforceSalesWrite()
  content = content.replace(/function enforceSalesWrite\(\) \{[^\}]*\}/g, 'async function enforceSalesWrite() {\n  const { requirePermission } = await import("@/lib/server-auth");\n  await requirePermission("sales.write");\n}');
  content = content.replace(/enforceSalesWrite\(\)/g, 'await enforceSalesWrite()');
  // Avoid doubling await if it's already awaited (e.g. await await)
  content = content.replace(/await\s+await\s+enforceSalesWrite\(\)/g, 'await enforceSalesWrite()');

  fs.writeFileSync(file, content);
}
console.log('Done');
