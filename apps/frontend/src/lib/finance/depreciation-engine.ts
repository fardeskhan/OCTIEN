import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { FinancialPostingService } from "./posting-engine";

export class DepreciationEngine {
  /**
   * Immutably generates the depreciation schedule for an asset using SLM.
   * Month 1 to (N-1) get mathematically exact 2-decimal rounding.
   * Month N absorbs the variance to hit exact residual value.
   */
  static async generateSchedule(assetId: string) {
    const asset = await db.fixedAsset.findUniqueOrThrow({
      where: { id: assetId }
    });

    if (asset.status !== "ACTIVE" || !asset.inServiceDate) {
      throw new Error("Asset must be ACTIVE and have an inServiceDate to generate a schedule.");
    }

    const cost = asset.cost.toNumber();
    const residual = asset.residualValue.toNumber();
    const lifeMonths = asset.usefulLifeMonths;

    if (lifeMonths <= 0) {
      throw new Error("Asset must have useful life greater than 0.");
    }

    const depreciableBase = cost - residual;
    
    // Strict 2-decimal rounded amount for months 1 to N-1
    const monthlyDepreciation = Math.round((depreciableBase / lifeMonths) * 100) / 100;

    let accumulated = 0;
    const schedules = [];
    
    // We assume inServiceDate is the starting date for the first period
    let currentPeriodDate = new Date(asset.inServiceDate);

    for (let i = 1; i <= lifeMonths; i++) {
      let scheduledAmount = 0;

      if (i === lifeMonths) {
        // Final month absorbs variance to hit exact depreciable base
        scheduledAmount = Math.round((depreciableBase - accumulated) * 100) / 100;
      } else {
        scheduledAmount = monthlyDepreciation;
      }

      accumulated += scheduledAmount;

      // Period ID e.g. "2027-01"
      const year = currentPeriodDate.getFullYear();
      const month = String(currentPeriodDate.getMonth() + 1).padStart(2, "0");
      const periodId = `${year}-${month}`;

      schedules.push({
        assetId: asset.id,
        periodId,
        scheduledDate: new Date(currentPeriodDate),
        scheduledAmount: new Prisma.Decimal(scheduledAmount),
        postedAmount: new Prisma.Decimal(0),
        status: "PENDING" as const
      });

      // Advance to next month
      currentPeriodDate.setMonth(currentPeriodDate.getMonth() + 1);
    }

    // Insert all schedules in a transaction
    await db.depreciationSchedule.createMany({
      data: schedules
    });

    // Event: DepreciationScheduled
    await db.outboxEventRecord.create({
      data: {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        eventType: "DepreciationScheduled",
        aggregateId: asset.id,
        aggregateVersion: 1,
        businessId: asset.businessId,
        tenantId: "default",
        occurredAt: new Date(),
        payload: JSON.stringify({ schedulesCount: lifeMonths, assetCode: asset.assetCode }),
        status: "PENDING"
      }
    });

    return schedules;
  }

  /** True only for a unique-violation on the GL (businessId, sourceType, sourceId) source index. */
  private static isJournalSourceConflict(e: unknown): boolean {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
    const t = (e.meta as { target?: unknown } | undefined)?.target;
    const s = Array.isArray(t) ? t.join(",") : typeof t === "string" ? t : "";
    return s.toLowerCase().includes("source");
  }

  /**
   * Posts depreciation for a given schedule ID.
   *
   * Invariant: one PENDING depreciation schedule produces exactly one balanced depreciation journal,
   * atomically, in an OPEN accounting period. All writes (journal + schedule state + asset state +
   * event) commit or roll back as ONE unit.
   *
   * Hardening:
   *  - Routes the journal through FinancialPostingService.postEntry (canonical open-period-by-date,
   *    balance, account-posting and audit enforcement) instead of a direct journal write.
   *  - Serializes concurrent posts for the same schedule with a row lock, and re-reads inside the tx.
   *  - Replay-safe: an already-POSTED schedule returns its existing journal (no second journal). The
   *    GL source-unique index (businessId, FIXED_ASSET_DEPRECIATION, schedule.id) is the DB backstop —
   *    a racing second insert (P2002) resolves to the winning journal rather than erroring.
   *  - `expectedBusinessId`, when supplied by a wired caller, refuses a schedule from another tenant
   *    (defense-in-depth; the eventual server-action/API wrapper must still enforce auth + business
   *    context before calling this internal engine method).
   */
  static async postDepreciation(scheduleId: string, expectedBusinessId?: string) {
    try {
      return await db.$transaction(async (tx) => {
        // Serialize concurrent posts for the same schedule: a second execution blocks here until the
        // first commits, then re-reads the row as POSTED and returns its journal (no duplicate).
        await tx.$queryRaw`SELECT id FROM depreciation_schedules WHERE id = ${scheduleId} FOR UPDATE`;

        const schedule = await tx.depreciationSchedule.findUniqueOrThrow({
          where: { id: scheduleId },
          include: { asset: { include: { category: true } } }
        });

        const businessId = schedule.asset.businessId;

        // Tenant guard: a cross-tenant scheduleId cannot post into another business.
        if (expectedBusinessId && expectedBusinessId !== businessId) {
          throw new Error("Depreciation schedule does not belong to this business");
        }

        // Replay: an already-POSTED schedule returns its existing journal; no second journal is made.
        if (schedule.status === "POSTED" && schedule.journalEntryId) {
          const existing = await tx.journalEntry.findUnique({ where: { id: schedule.journalEntryId } });
          if (existing) return existing;
        }
        if (schedule.status !== "PENDING") {
          throw new Error("Schedule is not PENDING");
        }

        if (schedule.asset.status === "DISPOSED") {
          throw new Error("Cannot post depreciation for a DISPOSED asset");
        }

        // Control accounts (Category owns the GL mapping); postEntry resolves + validates the codes.
        const category = schedule.asset.category;
        const amount = schedule.scheduledAmount.toNumber();

        const business = await tx.business.findUnique({ where: { id: businessId }, select: { tenantId: true } });
        const tenantId = business?.tenantId || "SYSTEM";

        // Canonical posting: enforces OPEN accounting period (matched by scheduledDate), balanced
        // debits/credits, account existence + allowPosting, and the JOURNAL_POSTED audit event — all
        // inside this transaction. Replaces the previous direct journalEntry.create bypass.
        const je = await FinancialPostingService.postEntry({
          tx,
          businessId,
          tenantId,
          date: schedule.scheduledDate,
          description: `Depreciation for ${schedule.asset.assetCode} - Period ${schedule.periodId}`,
          sourceType: "FIXED_ASSET_DEPRECIATION",
          sourceId: schedule.id,
          lines: [
            { accountCode: category.depreciationExpenseAccountId, debit: amount, credit: 0 },
            { accountCode: category.accumulatedDepreciationAccountId, debit: 0, credit: amount }
          ]
        });

        // Mark the schedule POSTED, guarded on it still being PENDING (belt-and-braces with the lock).
        const upd = await tx.depreciationSchedule.updateMany({
          where: { id: scheduleId, status: "PENDING" },
          data: {
            status: "POSTED",
            postedAmount: schedule.scheduledAmount,
            journalEntryId: je.id,
            postedAt: new Date(),
            postedBy: "SYSTEM"
          }
        });
        if (upd.count === 0) throw new Error("Schedule is no longer PENDING");

        // Fully-depreciated check — computed inside the tx so it sees this just-posted schedule.
        const postedSchedules = await tx.depreciationSchedule.findMany({
          where: { assetId: schedule.assetId, status: "POSTED" }
        });
        const postedDepreciation = postedSchedules.reduce((sum, sc) => sum + sc.postedAmount.toNumber(), 0);
        const nbv = Math.round((schedule.asset.cost.toNumber() - postedDepreciation) * 100) / 100;
        if (nbv === schedule.asset.residualValue.toNumber() && schedule.asset.status === "ACTIVE") {
          await tx.fixedAsset.update({
            where: { id: schedule.assetId },
            data: { status: "FULLY_DEPRECIATED" }
          });
        }

        // Event: DepreciationPosted — committed atomically with the journal + schedule state.
        await tx.outboxEventRecord.create({
          data: {
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            eventType: "DepreciationPosted",
            aggregateId: schedule.id,
            aggregateVersion: 1,
            businessId,
            tenantId,
            occurredAt: new Date(),
            payload: JSON.stringify({ amount, journalEntryId: je.id }),
            status: "PENDING"
          }
        });

        return je;
      });
    } catch (e) {
      // Concurrent race that slipped past the row lock (e.g. separate connections): the GL source-unique
      // index rejected the second journal. Return the journal that won rather than erroring.
      if (DepreciationEngine.isJournalSourceConflict(e)) {
        const winner = await db.depreciationSchedule.findUnique({
          where: { id: scheduleId },
          select: { journalEntryId: true }
        });
        if (winner?.journalEntryId) {
          const je = await db.journalEntry.findUnique({ where: { id: winner.journalEntryId } });
          if (je) return je;
        }
      }
      throw e;
    }
  }

  /**
   * Dynamic NBV evaluation (Cost - Sum of POSTED depreciations)
   */
  static async getNetBookValue(assetId: string) {
    const asset = await db.fixedAsset.findUniqueOrThrow({
      where: { id: assetId },
      include: {
        schedules: {
          where: { status: "POSTED" }
        }
      }
    });

    const postedDepreciation = asset.schedules.reduce((sum, sch) => sum + sch.postedAmount.toNumber(), 0);
    const netBookValue = Math.round((asset.cost.toNumber() - postedDepreciation) * 100) / 100;

    return netBookValue;
  }
}
