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
import { useReserveStock } from '@/features/inventory/mutations/reserveStock';
import { toast } from 'sonner';

const reserveStockSchema = z.object({
  businessId: z.string().min(1),
  productId: z.string().min(1, 'Product is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  batchId: z.string().optional(),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  reference: z.string().min(1, 'Reference is required'),
});

type ReserveFormValues = z.infer<typeof reserveStockSchema>;

export function ReserveStockDialog({ trigger, defaultProductId = '' }: { trigger: React.ReactNode, defaultProductId?: string }) {
  const [open, setOpen] = useState(false);
  const { mutateAsync, isPending } = useReserveStock();

  const form = useForm<ReserveFormValues>({
    resolver: zodResolver(reserveStockSchema),
    defaultValues: { businessId: 'bus_aeterex_001', productId: defaultProductId, warehouseId: '', batchId: '', quantity: 0, reference: '' },
  });

  const onSubmit = async (data: ReserveFormValues) => {
    try {
      await mutateAsync(data);
      toast.success(`Successfully reserved ${data.quantity} units!`, { description: `Reference: ${data.reference}` });
      form.reset({ ...form.getValues(), quantity: 0, reference: '' });
      setOpen(false); 
    } catch {
      toast.error('Failed to reserve stock.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Reserve Stock</DialogTitle><DialogDescription>Lock inventory for an impending order or operational requirement.</DialogDescription></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="productId" render={({ field }) => (<FormItem><FormLabel>Product ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="warehouseId" render={({ field }) => (<FormItem><FormLabel>Warehouse ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference / Order ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Processing...' : 'Reserve Stock'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
