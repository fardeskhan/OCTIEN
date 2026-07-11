import { db } from "@/lib/db";

export interface ResolvedPeriod {
  id: string | null;
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

/**
 * Resolve the reporting period for a business: the latest OPEN accounting period if one exists,
 * otherwise the most recent period, otherwise the current calendar month.
 */
export async function getCurrentPeriod(businessId: string): Promise<ResolvedPeriod> {
  const open = await db.accountingPeriod.findFirst({
    where: { businessId, status: "OPEN" },
    orderBy: { startDate: "desc" },
  });
  const period = open ?? (await db.accountingPeriod.findFirst({ where: { businessId }, orderBy: { startDate: "desc" } }));

  if (period) {
    return { id: period.id, name: period.name, startDate: period.startDate, endDate: period.endDate, status: period.status };
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { id: null, name: `${start.toLocaleString("en-US", { month: "short" })} ${start.getFullYear()}`, startDate: start, endDate: end, status: "OPEN" };
}
