"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCustomer } from "@/app/actions/customer";

export function CustomerCreateForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    if (!name) {
      toast.error("Customer name is required");
      return;
    }
    setPending(true);
    try {
      await createCustomer({
        name,
        email: (fd.get("email") as string) || undefined,
        phone: (fd.get("phone") as string) || undefined,
        address: (fd.get("address") as string) || undefined,
      });
      toast.success("Customer created");
      router.push("/sales/customers");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base font-medium">Customer Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input id="name" name="name" required placeholder="e.g. National Foods Ltd" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Billing Address</Label>
            <Input id="address" name="address" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create Customer"}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
