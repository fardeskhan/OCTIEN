import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const res = await db.receivableEntry.groupBy({
    by: ['dueDate'],
    where: { businessId: 'biz-1', status: { in: ['OPEN', 'PARTIALLY_PAID'] }, dueDate: { not: null } },
    _sum: { amount: true, paidAmount: true },
    take: 5
  });
  console.dir(res, {depth: null});
}
main().catch(console.error).finally(() => process.exit());
