// @ts-nocheck
"use server";

import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";

export async function seedBusinessMasterData() {
  const { currentBusinessId } = await requireBusinessContext();

  const units = [
    { name: "Pieces", symbol: "pcs" },
    { name: "Kilogram", symbol: "kg" },
    { name: "Gram", symbol: "g" },
    { name: "Liter", symbol: "L" },
    { name: "Milliliter", symbol: "ml" },
    { name: "Box", symbol: "box" },
    { name: "Carton", symbol: "carton" },
  ];

  for (const unit of units) {
    await db.unit.upsert({
      where: { businessId_symbol: { businessId: currentBusinessId, symbol: unit.symbol } },
      update: {},
      create: {
        businessId: currentBusinessId,
        name: unit.name,
        symbol: unit.symbol,
        isSystem: true,
      },
    });
  }

  const categories = [
    "Raw Materials",
    "Finished Goods",
    "Packaging",
    "Consumables",
    "Services"
  ];

  for (const cat of categories) {
    // Avoid creating duplicates if run multiple times
    const existing = await db.category.findFirst({
      where: { businessId: currentBusinessId, name: cat, deletedAt: null }
    });
    if (!existing) {
      await db.category.create({
        data: {
          businessId: currentBusinessId,
          name: cat,
        }
      });
    }
  }

  revalidatePath("/dashboard/reference");
  return { success: true };
}
