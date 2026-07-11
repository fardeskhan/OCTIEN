"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, requireBusinessContext, requireRole } from "@/lib/server-auth";
import { logAudit } from "@/lib/audit";

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "business";
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (await db.business.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

const PROFILE_FIELDS = [
  "legalName", "tagline", "email", "phone", "addressLine", "taxId",
  "primaryColor", "accentColor", "footerNote", "paymentInstructions", "logoUrl",
] as const;

function readProfile(formData: FormData): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const f of PROFILE_FIELDS) {
    const v = formData.get(f);
    if (v !== null) out[f] = (v as string).trim() || null;
  }
  return out;
}

export async function createBusiness(formData: FormData) {
  await requireRole("Owner");
  const { tenantId, userId, membership } = await requireBusinessContext();

  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Business name is required");

  const slug = await uniqueSlug(slugify(name));
  const businessType = (await db.businessType.findFirst()) ?? (await db.businessType.create({ data: { name: "General" } }));
  const currency = await db.currency.findFirst();

  const business = await db.business.create({
    data: {
      tenantId,
      businessTypeId: businessType.id,
      name,
      slug,
      status: "ACTIVE",
      defaultCurrencyId: currency?.id ?? null,
      fiscalYearStartMonth: 4,
      ...readProfile(formData),
    },
  });

  // Give the creator access with their current (Owner) role so it appears in the switcher.
  await db.membership.upsert({
    where: { userId_businessId: { userId, businessId: business.id } },
    update: { roleId: membership.roleId },
    create: { userId, businessId: business.id, roleId: membership.roleId },
  });

  // Open the current accounting period so the business is dashboard-ready immediately.
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const periodName = `${start.toLocaleString("en-US", { month: "short" })} ${start.getFullYear()}`;
  await db.accountingPeriod.upsert({
    where: { businessId_name: { businessId: business.id, name: periodName } },
    update: { status: "OPEN" },
    create: { businessId: business.id, name: periodName, startDate: start, endDate: end, status: "OPEN" },
  });

  await logAudit({ action: "create", resource: "business", resourceId: business.id, metadata: { name } });
  revalidatePath("/", "layout");
  redirect(`/business/${business.id}/settings`);
}

export async function updateBusiness(id: string, formData: FormData) {
  await requireRole("Owner");
  const { tenantId } = await requireBusinessContext();

  const existing = await db.business.findFirst({ where: { id, tenantId } });
  if (!existing) throw new Error("Business not found");

  const name = (formData.get("name") as string)?.trim();
  await db.business.update({
    where: { id },
    data: { ...(name ? { name } : {}), ...readProfile(formData) },
  });

  await logAudit({ action: "update", resource: "business", resourceId: id, metadata: { name: name || existing.name } });
  revalidatePath("/", "layout");
  revalidatePath(`/business/${id}/settings`);
  return { success: true };
}

export async function setBusinessStatus(id: string, status: "ACTIVE" | "ARCHIVED" | "SUSPENDED") {
  await requireRole("Owner");
  const { tenantId } = await requireBusinessContext();

  const existing = await db.business.findFirst({ where: { id, tenantId } });
  if (!existing) throw new Error("Business not found");

  await db.business.update({ where: { id }, data: { status } });
  await logAudit({ action: "status_change", resource: "business", resourceId: id, metadata: { status } });
  revalidatePath("/", "layout");
  revalidatePath("/business");
  return { success: true };
}

export async function switchBusiness(businessId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Verify the user actually has a membership to this business before switching
  const membership = await db.membership.findUnique({
    where: {
      userId_businessId: {
        userId: session.user.id,
        businessId: businessId,
      },
    },
  });

  if (!membership) {
    throw new Error("You do not have access to this business");
  }

  const cookieStore = await cookies();
  
  // Update the cookies
  cookieStore.set("current_business_id", businessId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  cookieStore.set("current_membership_id", membership.id, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  // Revalidate the entire dashboard layout to recalculate permissions and refresh UI
  revalidatePath("/", "layout");

  return { success: true };
}
