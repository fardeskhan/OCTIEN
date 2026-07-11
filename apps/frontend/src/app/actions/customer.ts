"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getBusinessId() {
  const { getActiveBusinessId } = await import("@/lib/server-auth");
  return getActiveBusinessId();
}

// Ensure the user has the required permission
async function enforceSalesWrite() {
  const { requirePermission } = await import("@/lib/server-auth");
  await requirePermission("sales.write");
}

async function generateCustomerCode(businessId: string): Promise<string> {
  const count = await db.customer.count({ where: { businessId, deletedAt: null } });
  return `CUS-${String(count + 1).padStart(5, "0")}`;
}

export async function createCustomer(data: { name: string, email?: string, phone?: string, address?: string }) {
  await enforceSalesWrite();
  const businessId = await getBusinessId();
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

  revalidatePath("/sales/customers");
  return customer;
}

export async function updateCustomerStatus(id: string, status: "ACTIVE" | "ON_HOLD" | "INACTIVE", creditStatus: "GOOD" | "HOLD" | "BLOCKED") {
  await enforceSalesWrite();
  const businessId = await getBusinessId();

  const customer = await db.customer.update({
    where: { id, businessId, deletedAt: null },
    data: { status, creditStatus }
  });

  revalidatePath("/sales/customers");
  revalidatePath(`/sales/customers/${id}`);
  return customer;
}

export async function getCustomers() {
  const businessId = await getBusinessId();
  return db.customer.findMany({
    where: { businessId, deletedAt: null },
    include: {
      contacts: true,
      addresses: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getCustomer(id: string) {
  const businessId = await getBusinessId();
  return db.customer.findUnique({
    where: { id, businessId, deletedAt: null },
    include: {
      contacts: true,
      addresses: true,
      quotations: { orderBy: { createdAt: 'desc' }, take: 5 },
      salesOrders: { orderBy: { createdAt: 'desc' }, take: 5 },
      returns: { orderBy: { createdAt: 'desc' }, take: 5 },
    }
  });
}
