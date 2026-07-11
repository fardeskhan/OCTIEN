import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export interface ReceiveStockPayload {
  businessId: string;
  productId: string;
  warehouseId: string;
  batchId: string;
  quantity: number;
}

export function useReceiveStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReceiveStockPayload) => {
      // In production, this posts to the Command Bus pipeline
      // return api.post('/api/v1/inventory/receive-stock', payload);
      
      // Simulate network request for UI Dev
      return new Promise(resolve => setTimeout(resolve, 800));
    },
    onSuccess: (_, variables) => {
      // Globally invalidate all relevant Read Models
      queryClient.invalidateQueries({ queryKey: ['inventory', 'product', variables.businessId, variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'products', variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dashboard', variables.businessId] });
    }
  });
}
