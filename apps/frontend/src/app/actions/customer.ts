// @ts-nocheck
"use server";

import { db } from "@/lib/db";
import { withActiveRecords } from "@/lib/db-helpers";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

function getBusinessId() {
  const cookieStore = cookies();
  const businessId = cookieStore.get("current_business_id")?.value;
  if (!businessId) throw new Error("No business context selected");
  return businessId;
}

// Ensure the user has the required permission
// In a real app we'd integrate this with the actual RBAC check
async function enforceSalesWrite() {
  const { requirePermission } = await import("@/lib/server-auth");
  await requirePermission("sales.write");
}

async function generateCustomerCode(businessId: string): Promise<string> {
  const count = await db.customer.count({ where: withActiveRecords({ businessId }) });
  return `CUS-${String(count + 1).padStart(5, "0")}`;
}

export async function createCustomer(data: { name: string, email?: string, phone?: string, address?: string }) {
  await enforceSalesWrite();
  const businessId = getBusinessId();
  const code = await generateCustomerCode(businessId);

  const customer = await db.customer.create({
    data: {
      businessId,
      code,
      name: data.name,
      status: "ACTIVE",
      creditStatus: "GOOD",
      contacts: data.email || data.phone ? {
        create: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          isPrimary: true
        }
      } : undefined,
      addresses: data.address ? {
        create: {
          label: "Billing",
          addressLine: data.address,
          isPrimary: true
        }
      } : undefined
    }
  });

  revalidatePath("/dashboard/sales/customers");
  return customer;
}

export async function updateCustomerStatus(id: string, status: "ACTIVE" | "ON_HOLD" | "INACTIVE", creditStatus: "GOOD" | "HOLD" | "BLOCKED") {
  await enforceSalesWrite();
  const businessId = getBusinessId();
  
  const customer = await db.customer.update({
    where: withActiveRecords({ id, businessId }),
    data: { status, creditStatus }
  });
  
  revalidatePath("/dashboard/sales/customers");
  revalidatePath(`/dashboard/sales/customers/${id}`);
  return customer;
}

export async function getCustomers() {
  const businessId = getBusinessId();
  return db.customer.findMany({
    where: withActiveRecords({ businessId }),
    include: {
      contacts: true,
      addresses: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getCustomer(id: string) {
  const businessId = getBusinessId();
  return db.customer.findUnique({
    where: withActiveRecords({ id, businessId }),
    include: {
      contacts: true,
      addresses: true,
      quotations: { orderBy: { createdAt: 'desc' }, take: 5 },
      salesOrders: { orderBy: { createdAt: 'desc' }, take: 5 },
      returns: { orderBy: { createdAt: 'desc' }, take: 5 },
    }
  });
}
