import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/orders';
import { salesKeys } from '../api/keys';

export function useConfirmOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => ordersApi.confirmOrder(orderId),
    onSuccess: (_, orderId) => {
      // Precision Cache Invalidation
      queryClient.invalidateQueries({ queryKey: salesKeys.order(orderId) });
      queryClient.invalidateQueries({ queryKey: salesKeys.orders() });
      queryClient.invalidateQueries({ queryKey: salesKeys.dashboards() });
      
      // We specifically DO NOT invalidate shipments/invoices because confirming an order
      // doesn't alter past shipment histories.
    },
  });
}
