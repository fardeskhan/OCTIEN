'use client';

import { useInventoryTimeline } from '@/features/inventory/queries/getTimeline';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, Download, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TimelinePage() {
  const { data: events, isLoading } = useInventoryTimeline('bus_aeterex_001');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movement Timeline</h1>
          <p className="text-muted-foreground mt-2">
            Immutable ledger of all inventory transactions.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Download className="w-4 h-4 mr-2"/> Export</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search references or SKUs..." className="pl-9 bg-background" />
          </div>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filter Log
          </Button>
        </div>

        <div className="w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Date / Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right hidden sm:table-cell">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : events?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">No events recorded.</TableCell>
                </TableRow>
              ) : (
                events?.map((ev) => (
                  <TableRow key={ev.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm">
                       <div className="font-medium">{new Date(ev.timestamp).toLocaleDateString()}</div>
                       <div className="text-xs text-muted-foreground">{new Date(ev.timestamp).toLocaleTimeString()}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] tracking-wider uppercase">{ev.type}</Badge>
                    </TableCell>
                    <TableCell>
                       <div className="font-medium">{ev.productSku}</div>
                       <div className="text-xs text-muted-foreground truncate w-32">{ev.productName}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                       {ev.type === 'TRANSFERRED' ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                             <span className="truncate w-20" title={ev.sourceWarehouse}>{ev.sourceWarehouse}</span>
                             <ArrowRight className="w-3 h-3" />
                             <span className="truncate w-20" title={ev.destinationWarehouse}>{ev.destinationWarehouse}</span>
                          </div>
                       ) : ev.sourceWarehouse ? (
                          <span className="text-muted-foreground">{ev.sourceWarehouse}</span>
                       ) : (
                          <span className="text-muted-foreground">{ev.destinationWarehouse}</span>
                       )}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${ev.quantity > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                       {ev.quantity > 0 ? '+' : ''}{ev.quantity}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{ev.reference}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm hidden sm:table-cell">{ev.user}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
