import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

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

  /**
   * Posts depreciation for a given schedule ID.
   * Respects Period Locks and derives GL accounts from Category.
   */
  static async postDepreciation(scheduleId: string) {
    const schedule = await db.depreciationSchedule.findUniqueOrThrow({
      where: { id: scheduleId },
      include: {
        asset: {
          include: { category: true }
        }
      }
    });

    if (schedule.status !== "PENDING") {
      throw new Error("Schedule is not PENDING");
    }

    if (schedule.asset.status === "DISPOSED") {
      // Event: DepreciationPostingRejected
      await db.outboxEventRecord.create({
        data: {
          eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          eventType: "DepreciationPostingRejected",
          aggregateId: schedule.id,
          aggregateVersion: 1,
          businessId: schedule.asset.businessId,
          tenantId: "default",
          occurredAt: new Date(),
          payload: JSON.stringify({ reason: "Asset is DISPOSED" }),
          status: "PENDING"
        }
      });
      throw new Error("Cannot post depreciation for a DISPOSED asset");
    }

    // 1. Period Integration Check
    const period = await db.accountingPeriod.findUnique({
      where: {
        businessId_name: {
          businessId: schedule.asset.businessId,
          name: schedule.periodId
        }
      }
    });

    if (period && period.status !== "OPEN") {
      // Event: DepreciationPostingRejected
      await db.outboxEventRecord.create({
        data: {
          eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          eventType: "DepreciationPostingRejected",
          aggregateId: schedule.id,
          aggregateVersion: 1,
          businessId: schedule.asset.businessId,
          tenantId: "default",
          occurredAt: new Date(),
          payload: JSON.stringify({ reason: `Period ${schedule.periodId} is ${period.status}` }),
          status: "PENDING"
        }
      });
      throw new Error(`Cannot post depreciation. Period ${schedule.periodId} is ${period.status}`);
    }

    // 2. Control Account Enforcement (Category owns GL mapping)
    const category = schedule.asset.category;
    const drAccount = category.depreciationExpenseAccountId;
    const crAccount = category.accumulatedDepreciationAccountId;

    const amount = schedule.scheduledAmount.toNumber();

    const drLedgerAcc = await db.ledgerAccount.findUniqueOrThrow({
      where: { businessId_accountCode: { businessId: schedule.asset.businessId, accountCode: drAccount } }
    });
    const crLedgerAcc = await db.ledgerAccount.findUniqueOrThrow({
      where: { businessId_accountCode: { businessId: schedule.asset.businessId, accountCode: crAccount } }
    });

    // 3. Post Journal (Simulated direct DB write for validation)
    // Normally this routes through FinancialPostingService, but we write direct here to avoid
    // coupling with incomplete posting logic if missing
    const je = await db.journalEntry.create({
      data: {
        businessId: schedule.asset.businessId,
        date: schedule.scheduledDate,
        description: `Depreciation for ${schedule.asset.assetCode} - Period ${schedule.periodId}`,
        sourceType: "FIXED_ASSET_DEPRECIATION",
        sourceId: schedule.id,
        lines: {
          create: [
            {
              businessId: schedule.asset.businessId,
              accountId: drLedgerAcc.id,
              debit: amount,
              credit: 0
            },
            {
              businessId: schedule.asset.businessId,
              accountId: crLedgerAcc.id,
              debit: 0,
              credit: amount
            }
          ]
        }
      }
    });

    // 4. Update Schedule
    await db.depreciationSchedule.update({
      where: { id: scheduleId },
      data: {
        status: "POSTED",
        postedAmount: schedule.scheduledAmount,
        journalEntryId: je.id,
        postedAt: new Date(),
        postedBy: "SYSTEM"
      }
    });

    // 5. Check if fully depreciated
    const nbv = await this.getNetBookValue(schedule.assetId);
    if (nbv === schedule.asset.residualValue.toNumber() && schedule.asset.status === "ACTIVE") {
      await db.fixedAsset.update({
        where: { id: schedule.assetId },
        data: { status: "FULLY_DEPRECIATED" }
      });
    }

    // Event: DepreciationPosted
    await db.outboxEventRecord.create({
      data: {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        eventType: "DepreciationPosted",
        aggregateId: schedule.id,
        aggregateVersion: 1,
        businessId: schedule.asset.businessId,
        tenantId: "default",
        occurredAt: new Date(),
        payload: JSON.stringify({ amount: amount, journalEntryId: je.id }),
        status: "PENDING"
      }
    });

    return je;
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
