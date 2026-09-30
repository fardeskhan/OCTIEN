import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { DepreciationEngine } from "./depreciation-engine";
import { FinancialPostingService } from "./posting-engine";

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

    // 2. Build journal lines by account CODE. postEntry resolves + validates each code (existence,
    //    allowPosting) inside the posting transaction — no separate pre-lookup needed. 4300 gain /
    //    5400 loss per ADR.
    const category = asset.category;
    const lines: { accountCode: string; debit?: number; credit?: number }[] = [];

    if (accumulatedDepreciation > 0) {
      // Reverse Accumulated Depreciation (Debit)
      lines.push({ accountCode: category.accumulatedDepreciationAccountId, debit: accumulatedDepreciation });
    }
    if (cost > 0) {
      // Derecognize Asset Cost (Credit)
      lines.push({ accountCode: category.assetAccountId, credit: cost });
    }
    if (proceeds > 0 && params.proceedsAccountCode) {
      // Record Proceeds (Debit)
      lines.push({ accountCode: params.proceedsAccountCode, debit: proceeds });
    }
    if (gainLossAmount > 0) {
      // Gain is a credit
      lines.push({ accountCode: "4300", credit: gainLossAmount });
    } else if (gainLossAmount < 0) {
      // Loss is a debit
      lines.push({ accountCode: "5400", debit: Math.abs(gainLossAmount) });
    }

    // tenantId for the posting audit event (derived from the asset's business).
    const business = await db.business.findUnique({ where: { id: asset.businessId }, select: { tenantId: true } });
    const tenantId = business?.tenantId || "SYSTEM";

    // 3. Run Transaction
    const result = await db.$transaction(async (tx) => {
      // Canonical posting: enforces an OPEN accounting period for the disposal date, balanced
      // debits/credits, account existence + allowPosting, and the JOURNAL_POSTED audit event — all
      // inside this transaction. Replaces the previous direct journalEntry.create bypass, which did
      // NO period check at all.
      const je = await FinancialPostingService.postEntry({
        tx,
        businessId: asset.businessId,
        tenantId,
        date: params.disposalDate,
        description: `Disposal of Fixed Asset: ${asset.assetCode} (${params.disposalType})`,
        sourceType: "FIXED_ASSET_DISPOSAL",
        sourceId: asset.id,
        lines,
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
          tenantId,
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
