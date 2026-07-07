const fs = require('fs');
let content = fs.readFileSync('apps/frontend/scripts/seed-rc2-full.ts', 'utf8');

content = content.replace(
  'const business = await db.business.create({',
  `const bt = await db.businessType.create({ data: { name: "UCO", description: "UCO" } });
  const business = await db.business.create({`
);

content = content.replace(
  'type: "UCO",',
  'businessType: { connect: { id: bt.id } },'
);

fs.writeFileSync('apps/frontend/scripts/seed-rc2-full.ts', content);
