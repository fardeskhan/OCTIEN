'use client';

import { useInventoryWarehouse } from '@/features/inventory/queries/getWarehouse';
import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, DollarSign, Activity } from 'lucide-react';

export default function WarehouseWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: warehouse, isLoading } = useInventoryWarehouse('bus_aeterex_001', resolvedParams.id);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-12 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (!warehouse) return <div>Warehouse not found</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{warehouse.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm uppercase tracking-wider">{warehouse.type}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Units Stored</span>
              <Package className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{warehouse.metrics.currentInventory.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Across {warehouse.metrics.totalProducts} distinct products</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Estimated Value</span>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">${warehouse.metrics.inventoryValue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Capacity Utilization</span>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mb-2">{warehouse.metrics.utilizationPercentage}%</div>
            <Progress value={warehouse.metrics.utilizationPercentage} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card className="h-96 flex items-center justify-center">
            <span className="text-muted-foreground">Recent Activity Widget</span>
         </Card>
         <Card className="h-96 flex items-center justify-center">
            <span className="text-muted-foreground">Active Batches List</span>
         </Card>
      </div>
    </div>
  );
}
