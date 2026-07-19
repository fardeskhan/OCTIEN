/**
 * Guarantee every business has an OPEN accounting period for the current month.
 *
 * Idempotent and non-destructive: only creates a period where one is missing, so the executive
 * dashboard never throws "No open period found". Safe to run against Neon repeatedly.
 *
 * Run: node -r dotenv/config scripts/ensure-open-periods.mjs
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const now = new Date();
const start = new Date(now.getFullYear(), now.getMonth(), 1);
const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
const name = `${start.toLocaleString("en-US", { month: "short" })} ${start.getFullYear()}`;

const businesses = await db.business.findMany({ select: { id: true, name: true } });
let created = 0;
for (const b of businesses) {
  const open = await db.accountingPeriod.findFirst({ where: { businessId: b.id, status: "OPEN" } });
  if (open) continue;
  await db.accountingPeriod.upsert({
    where: { businessId_name: { businessId: b.id, name } },
    update: { status: "OPEN" },
    create: { businessId: b.id, name, startDate: start, endDate: end, status: "OPEN" },
  });
  created++;
  console.log(`  opened period for ${b.name}`);
}
console.log(`DONE — ${businesses.length} businesses checked, ${created} OPEN period(s) created.`);
await db.$disconnect();
