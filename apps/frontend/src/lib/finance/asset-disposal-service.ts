import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { DepreciationEngine } from "./depreciation-engine";

export class AssetDisposalService {
  /**
   * Disposes of an asset (SALE, SCRAP, WRITE_OFF).
   * Generates a disposal journal entry for derecognizing the asset and recording gain/loss.
   */
  static async disposeAsset(params: {
    assetId: string;
    disposalDate: Date;
    disposalType: "SALE" | "SCRAP" | "WRITE_OFF";
    proceedsAmount: number;
    // We assume proceeds are deposited to this account (e.g. Bank Account Code)
    proceedsAccountCode?: string; 
  }) {
    const asset = await db.fixedAsset.findUniqueOrThrow({
      where: { id: params.assetId },
      include: {
        category: true,
        schedules: {
          where: { status: "POSTED" }
        }
      }
    });

    if (asset.status === "DRAFT" || asset.status === "DISPOSED") {
      throw new Error(`Cannot dispose asset with status ${asset.status}`);
    }

    // 1. Calculate values
    const cost = asset.cost.toNumber();
    const accumulatedDepreciation = asset.schedules.reduce((sum, sch) => sum + sch.postedAmount.toNumber(), 0);
    const nbv = await DepreciationEngine.getNetBookValue(asset.id);
    
    let proceeds = params.proceedsAmount;
    if (params.disposalType === "WRITE_OFF") {
      proceeds = 0;
    }

    const gainLossAmount = proceeds - nbv;

    // 2. Lookup necessary Ledger Accounts
    const category = asset.category;
    
    // We need the internal ID for journal lines
    const assetAccount = await db.ledgerAccount.findUniqueOrThrow({
      where: { businessId_accountCode: { businessId: asset.businessId, accountCode: category.assetAccountId } }
    });
    const accDepAccount = await db.ledgerAccount.findUniqueOrThrow({
      where: { businessId_accountCode: { businessId: asset.businessId, accountCode: category.accumulatedDepreciationAccountId } }
    });
    
    let proceedsAccount = null;
    if (proceeds > 0 && params.proceedsAccountCode) {
      proceedsAccount = await db.ledgerAccount.findUniqueOrThrow({
        where: { businessId_accountCode: { businessId: asset.businessId, accountCode: params.proceedsAccountCode } }
      });
    }

    // We hardcode 4300 for Gain and 5400 for Loss as per user ADR requirement, but look up internal ID
    const gainAccount = await db.ledgerAccount.findUniqueOrThrow({
      where: { businessId_accountCode: { businessId: asset.businessId, accountCode: "4300" } }
    });
    const lossAccount = await db.ledgerAccount.findUniqueOrThrow({
      where: { businessId_accountCode: { businessId: asset.businessId, accountCode: "5400" } }
    });

    // 3. Build Journal Lines
    const lines: any[] = [];

    // Reverse Accumulated Depreciation (Debit)
    if (accumulatedDepreciation > 0) {
      lines.push({
        businessId: asset.businessId,
        accountId: accDepAccount.id,
        debit: accumulatedDepreciation,
        credit: 0
      });
    }

    // Derecognize Asset Cost (Credit)
    if (cost > 0) {
      lines.push({
        businessId: asset.businessId,
        accountId: assetAccount.id,
        debit: 0,
        credit: cost
      });
    }

    // Record Proceeds (Debit)
    if (proceeds > 0 && proceedsAccount) {
      lines.push({
        businessId: asset.businessId,
        accountId: proceedsAccount.id,
        debit: proceeds,
        credit: 0
      });
    }

    // Record Gain (Credit) or Loss (Debit)
    if (gainLossAmount > 0) {
      // Gain is a credit
      lines.push({
        businessId: asset.businessId,
        accountId: gainAccount.id,
        debit: 0,
        credit: gainLossAmount
      });
    } else if (gainLossAmount < 0) {
      // Loss is a debit
      lines.push({
        businessId: asset.businessId,
        accountId: lossAccount.id,
        debit: Math.abs(gainLossAmount),
        credit: 0
      });
    }

    // 4. Run Transaction
    const result = await db.$transaction(async (tx) => {
      // Create Journal Entry
      const je = await tx.journalEntry.create({
        data: {
          businessId: asset.businessId,
          date: params.disposalDate,
          description: `Disposal of Fixed Asset: ${asset.assetCode} (${params.disposalType})`,
          sourceType: "FIXED_ASSET_DISPOSAL",
          sourceId: asset.id,
          lines: {
            create: lines
          }
        }
      });

      // Create Disposal Record
      const disposal = await tx.assetDisposal.create({
        data: {
          assetId: asset.id,
          disposalDate: params.disposalDate,
          disposalType: params.disposalType,
          proceedsAmount: new Prisma.Decimal(proceeds),
          gainLossAmount: new Prisma.Decimal(gainLossAmount),
          journalEntryId: je.id
        }
      });

      // Update Asset Status to DISPOSED
      await tx.fixedAsset.update({
        where: { id: asset.id },
        data: {
          status: "DISPOSED"
        }
      });

      // Cancel any remaining PENDING depreciation schedules
      await tx.depreciationSchedule.updateMany({
        where: {
          assetId: asset.id,
          status: "PENDING"
        },
        data: {
          status: "SKIPPED"
        }
      });

      // Event: AssetDisposed
      await tx.outboxEventRecord.create({
        data: {
          eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          eventType: "AssetDisposed",
          aggregateId: asset.id,
          aggregateVersion: 2,
          businessId: asset.businessId,
          tenantId: "default",
          occurredAt: new Date(),
          payload: JSON.stringify({ 
            disposalType: params.disposalType, 
            proceeds: proceeds,
            gainLoss: gainLossAmount,
            journalEntryId: je.id 
          }),
          status: "PENDING"
        }
      });

      return { disposal, journalEntry: je };
    });

    return result;
  }
}
