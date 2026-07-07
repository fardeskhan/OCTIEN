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
import { useTransferStock } from '@/features/inventory/mutations/transferStock';
import { toast } from 'sonner';

const transferStockSchema = z.object({
  businessId: z.string().min(1),
  productId: z.string().min(1, 'Product is required'),
  sourceWarehouseId: z.string().min(1, 'Source Warehouse is required'),
  destinationWarehouseId: z.string().min(1, 'Destination Warehouse is required'),
  batchId: z.string().min(1, 'Batch ID is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
});

type TransferFormValues = z.infer<typeof transferStockSchema>;

export function TransferStockDialog({ trigger, defaultProductId = '' }: { trigger: React.ReactNode, defaultProductId?: string }) {
  const [open, setOpen] = useState(false);
  const { mutateAsync, isPending } = useTransferStock();

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferStockSchema),
    defaultValues: { businessId: 'bus_aeterex_001', productId: defaultProductId, sourceWarehouseId: '', destinationWarehouseId: '', batchId: '', quantity: 0 },
  });

  const onSubmit = async (data: any) => {
    if (data.sourceWarehouseId === data.destinationWarehouseId) {
       form.setError('destinationWarehouseId', { message: 'Must be different from source warehouse' });
       return;
    }
    try {
      await mutateAsync(data);
      toast.success(`Successfully transferred ${data.quantity} units!`);
      form.reset();
      setOpen(false); 
    } catch {
      toast.error('Failed to transfer stock.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Transfer Stock</DialogTitle><DialogDescription>Move stock accurately between locations.</DialogDescription></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="productId" render={({ field }: any) => (<FormItem><FormLabel>Product ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
               <FormField control={form.control} name="sourceWarehouseId" render={({ field }: any) => (<FormItem><FormLabel>Source WH</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
               <FormField control={form.control} name="destinationWarehouseId" render={({ field }: any) => (<FormItem><FormLabel>Destination WH</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <FormField control={form.control} name="batchId" render={({ field }: any) => (<FormItem><FormLabel>Batch ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
               <FormField control={form.control} name="quantity" render={({ field }: any) => (<FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Processing...' : 'Transfer Stock'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
