'use client';

import { useInventoryBatch } from '@/features/inventory/queries/getBatch';
import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft, Box, Calendar, Warehouse } from 'lucide-react';

export default function BatchWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: batch, isLoading } = useInventoryBatch('bus_aeterex_001', resolvedParams.id);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-12 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (!batch) return <div>Batch not found</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/inventory/products/${batch.productId}`} className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Product
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{batch.batchNumber}</h1>
          <Badge variant={batch.status === 'OPEN' ? 'secondary' : 'outline'} className={batch.status === 'OPEN' ? 'bg-emerald-500/15 text-emerald-600' : ''}>{batch.status}</Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{batch.productName} ({batch.productId})</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Current Qty</span>
              <Box className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{batch.currentQuantity.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Initial: {batch.initialQuantity.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Location</span>
              <Warehouse className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-bold">{batch.warehouse}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Received Date</span>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-bold">{new Date(batch.receivedDate).toLocaleDateString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Expiry Date</span>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-bold">{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
