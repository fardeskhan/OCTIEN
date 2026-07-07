// @ts-nocheck
'use client';

import { useInventoryProduct } from '@/features/inventory/queries/getProduct';
import { use } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PackagePlus, ArrowRightLeft, Lock, FileClock, Warehouse, Hash } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { ReceiveStockDialog } from '@/features/inventory/components/ReceiveStockDialog';
import { ReserveStockDialog } from '@/features/inventory/components/ReserveStockDialog';
import { TransferStockDialog } from '@/features/inventory/components/TransferStockDialog';
import { AdjustStockDialog } from '@/features/inventory/components/AdjustStockDialog';

export default function ProductWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: product, isLoading } = useInventoryProduct('bus_aeterex_001', resolvedParams.id);

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-12 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!product) return <div>Product not found</div>;

  return (
    <div className="space-y-6">
      {/* Product Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/inventory" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Products
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            {product.status === 'ACTIVE' && <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600">Active</Badge>}
            {product.status === 'LOW_STOCK' && <Badge variant="outline" className="text-amber-600 border-amber-500/50">Low Stock</Badge>}
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-sm">{product.sku}</p>
        </div>

        {/* Workspace Quick Actions */}
        <div className="flex gap-2">
           <ReceiveStockDialog defaultProductId={product.id} trigger={<Button><PackagePlus className="w-4 h-4 mr-2 hidden sm:block" /> Receive</Button>} />
           <ReserveStockDialog defaultProductId={product.id} trigger={<Button variant="outline"><Lock className="w-4 h-4 mr-2 hidden sm:block" /> Reserve</Button>} />
           <TransferStockDialog defaultProductId={product.id} trigger={<Button variant="outline"><ArrowRightLeft className="w-4 h-4 mr-2 hidden sm:block" /> Transfer</Button>} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column */}
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Category</div>
                <div className="font-medium">{product.category}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Description</div>
                <div className="text-sm mt-1 leading-relaxed">{product.description}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
                <CardTitle className="text-base">Quick Links</CardTitle>
             </CardHeader>
             <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground"><FileClock className="w-4 h-4 mr-3" /> Full Timeline</Button>
                <AdjustStockDialog defaultProductId={product.id} trigger={<Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground"><Hash className="w-4 h-4 mr-3" /> Adjust Stock</Button>} />
             </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="md:col-span-8 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Current Stock Overview</CardTitle>
              <Warehouse className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-3xl font-bold text-foreground">{product.totalAvailable.toLocaleString()}</div>
                  <div className="text-sm font-medium text-muted-foreground mt-1">Available</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">{product.totalReserved.toLocaleString()}</div>
                  <div className="text-sm font-medium text-muted-foreground mt-1">Reserved</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold">Location Breakdown</div>
                {product.warehouses.map(w => (
                  <div key={w.id} className="flex justify-between items-center text-sm p-3 rounded border border-border bg-muted/20">
                    <span className="font-medium">{w.name}</span>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Avail: <span className="font-medium text-foreground">{w.available}</span></span>
                      <span className="text-muted-foreground">Resv: <span className="font-medium text-foreground">{w.reserved}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card>
                <CardHeader>
                   <CardTitle className="text-base">Open Batches</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                   {product.recentBatches.map(b => (
                      <div key={b.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                         <div>
                            <div className="text-sm font-medium">{b.batchNumber}</div>
                            <div className="text-xs text-muted-foreground">Qty: {b.quantity.toLocaleString()}</div>
                         </div>
                         <Badge variant="outline" className="text-[10px]">{b.status}</Badge>
                      </div>
                   ))}
                </CardContent>
             </Card>

             <Card>
                <CardHeader>
                   <CardTitle className="text-base">Recent Movements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                   {product.recentMovements.map(m => (
                      <div key={m.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                         <div>
                            <div className="text-sm font-medium capitalize">{m.type.toLowerCase()}</div>
                            <div className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString()}</div>
                         </div>
                         <div className="text-sm font-medium text-foreground">{m.quantity > 0 ? '+' : ''}{m.quantity}</div>
                      </div>
                   ))}
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
