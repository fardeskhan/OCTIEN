import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createWarehouse } from "@/app/actions/warehouse";
import { WarehouseType } from "@prisma/client";
import { MapPin, Box, Store } from "lucide-react";

export default async function WarehousesPage() {
  const { currentBusinessId } = await requireBusinessContext();

  const warehouses = await db.warehouse.findMany({
    where: { businessId: currentBusinessId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Warehouses</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {warehouses.map(warehouse => (
                  <div key={warehouse.id} className="p-4 border rounded shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg">{warehouse.name}</h3>
                        {warehouse.isDefault && (
                          <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">Default</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-mono mt-1">Code: {warehouse.code}</p>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-2">
                        <Store className="h-4 w-4" />
                        <span>{warehouse.warehouseType}</span>
                      </div>
                      {warehouse.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <MapPin className="h-4 w-4" />
                          <span>{warehouse.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {warehouses.length === 0 && (
                  <div className="col-span-2 text-center p-8 text-gray-500 border rounded">
                    No warehouses configured. Add your primary location.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Create Warehouse</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await createWarehouse(formData);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Warehouse Name</label>
                  <input name="name" required placeholder="e.g. Main Distribution Center" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Internal Code</label>
                  <input name="code" required placeholder="e.g. MDC-01" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select name="warehouseType" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {Object.values(WarehouseType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Physical Location</label>
                  <input name="location" placeholder="e.g. Dubai, UAE" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input type="checkbox" id="isDefault" name="isDefault" className="h-4 w-4 rounded border-gray-300" />
                  <label htmlFor="isDefault" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Set as default warehouse
                  </label>
                </div>

                <Button type="submit" className="w-full">Create</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
