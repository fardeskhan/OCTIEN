// @ts-nocheck
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAdjustStock } from '@/features/inventory/mutations/adjustStock';
import { toast } from 'sonner';

const adjustStockSchema = z.object({
  businessId: z.string().min(1),
  productId: z.string().min(1, 'Product is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  batchId: z.string().min(1, 'Batch ID is required'),
  quantity: z.coerce.number(), // Can be negative for cycle count shrinkage
  reason: z.string().min(1, 'Reason code is required'),
});

type AdjustFormValues = z.infer<typeof adjustStockSchema>;

export function AdjustStockDialog({ trigger, defaultProductId = '' }: { trigger: React.ReactNode, defaultProductId?: string }) {
  const [open, setOpen] = useState(false);
  const { mutateAsync, isPending } = useAdjustStock();

  const form = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: { businessId: 'bus_aeterex_001', productId: defaultProductId, warehouseId: '', batchId: '', quantity: 0, reason: '' },
  });

  const onSubmit = async (data: AdjustFormValues) => {
    try {
      await mutateAsync(data);
      toast.success(`Adjustment recorded successfully.`);
      form.reset();
      setOpen(false); 
    } catch {
      toast.error('Failed to record adjustment.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Adjust Stock</DialogTitle><DialogDescription>Perform cycle counts or write-offs. Use negative values for shrinkage.</DialogDescription></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="productId" render={({ field }) => (<FormItem><FormLabel>Product ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="warehouseId" render={({ field }) => (<FormItem><FormLabel>Warehouse ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
               <FormField control={form.control} name="batchId" render={({ field }) => (<FormItem><FormLabel>Batch ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
               <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Delta Qty (-/+)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>Reason Code</FormLabel><FormControl><Input placeholder="e.g. SHRINKAGE" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={isPending}>{isPending ? 'Processing...' : 'Apply Adjustment'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
