import { PrismaClient, CostCenterType } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.5 PHASE 1 VALIDATION ===\n");

  const business = await db.business.findFirst();
  if (!business) throw new Error("No business found");

  // Clean up existing cost centers for clean run
  await db.costCenter.deleteMany({ where: { businessId: business.id } });

  // 1. Create CORP (Level 0)
  const corp = await db.costCenter.create({
    data: {
      businessId: business.id,
      code: "CORP",
      name: "Corporate",
      type: CostCenterType.CORPORATE,
      level: 0,
      path: "CORP"
    }
  });
  console.log(`✅ Created Cost Center: ${corp.name} (${corp.code}) - Level: ${corp.level}, Path: ${corp.path}`);

  // 2. Create Children (Level 1)
  const childrenData = [
    { code: "OPS", name: "Operations", type: CostCenterType.OPERATIONS },
    { code: "SALES", name: "Sales", type: CostCenterType.SALES },
    { code: "MKT", name: "Marketing", type: CostCenterType.MARKETING },
    { code: "ADMIN", name: "Administration", type: CostCenterType.ADMINISTRATION }
  ];

  for (const child of childrenData) {
    const cc = await db.costCenter.create({
      data: {
        businessId: business.id,
        code: child.code,
        name: child.name,
        type: child.type,
        parentId: corp.id,
        level: corp.level + 1,
        path: `${corp.path}/${child.code}`
      }
    });
    console.log(`✅ Created Cost Center: ${cc.name} (${cc.code}) - Level: ${cc.level}, Path: ${cc.path}`);
  }

  // 3. Validation
  const ops = await db.costCenter.findUniqueOrThrow({ where: { businessId_code: { businessId: business.id, code: "OPS" } }, include: { parent: true } });
  const mkt = await db.costCenter.findUniqueOrThrow({ where: { businessId_code: { businessId: business.id, code: "MKT" } }, include: { parent: true } });
  const retrievedCorp = await db.costCenter.findUniqueOrThrow({ where: { businessId_code: { businessId: business.id, code: "CORP" } } });

  console.log("\n--- VALIDATION CHECKS ---");
  
  if (ops.parent?.code === "CORP" && mkt.parent?.code === "CORP") {
    console.log("✅ OPS and MKT parent is CORP");
  } else {
    console.log("❌ Hierarchy parent check failed");
  }

  if (retrievedCorp.level === 0 && mkt.level === 1) {
    console.log("✅ CORP level = 0, MKT level = 1");
  } else {
    console.log("❌ Level check failed");
  }

  if (retrievedCorp.path === "CORP" && mkt.path === "CORP/MKT") {
    console.log("✅ CORP path = 'CORP', MKT path = 'CORP/MKT'");
  } else {
    console.log("❌ Path check failed");
  }

  console.log("\n=== RC5.5 PHASE 1 VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());
