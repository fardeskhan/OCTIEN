// @ts-nocheck
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/server-auth";

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
