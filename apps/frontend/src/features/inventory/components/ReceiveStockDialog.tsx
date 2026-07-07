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
import { useReceiveStock } from '@/features/inventory/mutations/receiveStock';
import { toast } from 'sonner';

const receiveStockSchema = z.object({
  businessId: z.string().min(1),
  productId: z.string().min(1, 'Product is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  batchId: z.string().min(1, 'Batch is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
});

type ReceiveFormValues = z.infer<typeof receiveStockSchema>;

export function ReceiveStockDialog({ trigger, defaultProductId = '' }: { trigger: React.ReactNode, defaultProductId?: string }) {
  const [open, setOpen] = useState(false);
  const { mutateAsync, isPending } = useReceiveStock();

  const form = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveStockSchema),
    defaultValues: {
      businessId: 'bus_aeterex_001',
      productId: defaultProductId,
      warehouseId: '', // Ideally, default to user's last selected warehouse as per requirements
      batchId: '',
      quantity: 0,
    },
  });

  const onSubmit = async (data: ReceiveFormValues) => {
    try {
      await mutateAsync(data);
      toast.success(`Successfully received ${data.quantity} units!`, {
        description: `Product ${data.productId} added to Warehouse ${data.warehouseId}.`
      });
      form.reset({
         ...form.getValues(),
         batchId: '', // Reset batch and qty, keep context
         quantity: 0,
      });
      // Dialog kept open per UX requirements (receive another batch)
    } catch (error) {
      toast.error('Failed to receive stock. Please check permissions and try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Receive Stock</DialogTitle>
          <DialogDescription>
            Register incoming inventory into a specific warehouse and batch.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Search or enter Product ID..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warehouse ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. WH-DUBAI-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="batchId"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Batch ID</FormLabel>
                     <FormControl>
                       <Input placeholder="e.g. BATCH-2026" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               <FormField
                 control={form.control}
                 name="quantity"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Quantity</FormLabel>
                     <FormControl>
                       <Input type="number" placeholder="0" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Processing...' : 'Confirm Receipt'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
